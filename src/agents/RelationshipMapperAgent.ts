import { Agent } from './base/Agent';
import { llmClient } from '../llm/client';
import { PromptTemplates } from '../llm/prompts';
import { 
  getConceptsByPaper,
  createConceptImprovement,
  createCitation,
  linkPaperToMethod,
  linkPaperToDataset
} from '../database/queries';
import { db } from '../database/client';

/**
 * RelationshipMapperAgent
 * 
 * Responsibilities:
 * 1. Map concept improvement relationships
 * 2. Classify citation relationships
 * 3. Identify method and dataset usage
 * 4. Extract quantitative gains
 */
export class RelationshipMapperAgent extends Agent {
  constructor() {
    super('RelationshipMapperAgent', 'mapper');
  }
  
  /**
   * Main execution method
   * 
   * Input: { paperId: string, entities: ExtractedEntities }
   * Output: Relationship data
   */
  async execute(input: any): Promise<any> {
    this.log('Starting relationship mapping');
    this.validateInput(input, ['paperId', 'entities']);
    
    try {
      const results = {
        improvements: await this.mapImprovements(input.paperId, input.entities),
        citations: await this.mapCitations(input.paperId),
        usage: await this.mapUsageRelationships(input.paperId, input.entities),
      };
      
      this.log(`Mapped ${results.improvements.length} improvements, ${results.citations.length} citations`);
      
      return results;
      
    } catch (error) {
      this.logError('Failed to map relationships', error);
      throw error;
    }
  }
  
  /**
   * Map concept improvement relationships
   * 
   * For each extracted concept:
   * 1. Find potential predecessor concepts in database
   * 2. Use LLM to classify if improvement exists
   * 3. Extract quantitative gains
   * 4. Store relationship
   */
  private async mapImprovements(paperId: string, entities: any): Promise<any[]> {
    this.log('Mapping concept improvements');
    
    const improvements: any[] = [];
    
    try {
      // Get concepts introduced by this paper
      const paperConcepts = await getConceptsByPaper(paperId);
      
      if (!paperConcepts || paperConcepts.length === 0) {
        this.log('No concepts found for paper', 'debug');
        return improvements;
      }
      
      // For each concept, find potential related concepts
      for (const paperConcept of paperConcepts) {
        //Type assertion for the concept object
        const concept = (paperConcept as any).concepts as {
          id: string;
          name: string;
          description?: string;
          normalized_name?: string;
        } | undefined;
        
        if (!concept) continue;
        
        try {
          // Query for potentially related concepts
          const { data: relatedConcepts } = await db.getClient()
            .from('concepts')
            .select('*')
            .neq('id', concept.id)
            .limit(10);
          
          if (!relatedConcepts || relatedConcepts.length === 0) continue;
          
          // Check each related concept for improvement relationship
          for (const oldConcept of relatedConcepts) {
            try {
              // Use LLM to classify relationship
              const prompt = PromptTemplates.classifyRelationship(
                {
                  name: concept.name,
                  description: concept.description || '',
                },
                {
                  name: oldConcept.name,
                  description: oldConcept.description || '',
                }
              );
              
              const result = await llmClient.extractStructuredData(prompt);
              
              // If there's a relationship, store it
              if (result.has_relationship && result.relationship_type === 'improves_on') {
                const improvement = await createConceptImprovement(
                  concept.id,
                  oldConcept.id,
                  result.improvement_category || 'quality',
                  result.quantitative_gain,
                  result.confidence || 0.7
                );
                
                improvements.push(improvement);
                this.log(`Found improvement: ${concept.name} improves ${oldConcept.name}`);
              }
              
            } catch (error) {
              this.logError(`Failed to classify relationship for ${concept.name}`, error);
            }
          }
          
        } catch (error) {
          this.logError(`Failed to process concept ${concept.name}`, error);
        }
      }
      
      return improvements;
      
    } catch (error) {
      this.logError('Failed to map improvements', error);
      return improvements;
    }
  }
  
  /**
   * Map citation relationships
   * 
   * Parse references from paper and create citation edges
   */
  private async mapCitations(paperId: string): Promise<any[]> {
    this.log('Mapping citations');
    
    const citations: any[] = [];
    
    try {
      // Get the paper data
      const { data: paper } = await db.getClient()
        .from('papers')
        .select('*')
        .eq('id', paperId)
        .single();
      
      if (!paper) {
        this.log('Paper not found', 'warn');
        return citations;
      }
      
      // Get papers that might be cited (by arXiv ID if available)
      if (paper.arxiv_id) {
        // For now, we'll rely on Semantic Scholar API data
        // which was already used in PaperReaderAgent
        this.log('Citation mapping from Semantic Scholar data', 'debug');
      }
      
      // TODO: Parse references from PDF text and match to papers in database
      // This would require more sophisticated reference parsing
      
      return citations;
      
    } catch (error) {
      this.logError('Failed to map citations', error);
      return citations;
    }
  }
  
  /**
   * Map method and dataset usage relationships
   */
  private async mapUsageRelationships(paperId: string, entities: any): Promise<any> {
    this.log('Mapping usage relationships');
    
    const usage = {
      methods: 0,
      datasets: 0,
    };
    
    try {
      // Method usage is already handled in EntityExtractorAgent
      // This is a placeholder for additional usage relationship logic
      
      // Dataset usage is already handled in EntityExtractorAgent
      // This is a placeholder for additional usage relationship logic
      
      return usage;
      
    } catch (error) {
      this.logError('Failed to map usage relationships', error);
      return usage;
    }
  }
  
  /**
   * Find similar concepts in database
   */
  private async findSimilarConcepts(conceptName: string, limit: number = 5): Promise<any[]> {
    try {
      const { data } = await db.getClient()
        .from('concepts')
        .select('*')
        .ilike('name', `%${conceptName}%`)
        .limit(limit);
      
      return data || [];
      
    } catch (error) {
      this.logError('Failed to find similar concepts', error);
      return [];
    }
  }
}