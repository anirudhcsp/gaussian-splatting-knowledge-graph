import { Agent } from './base/Agent';
import { ExtractedEntities } from '../types';
import { llmClient } from '../llm/client';
import { PromptTemplates } from '../llm/prompts';
import { 
  insertConcept, 
  insertMethod, 
  insertDataset,
  getConceptByName,
  getMethodByName,
  getDatasetByName,
  linkPaperToConcept,
  linkPaperToMethod,
  linkPaperToDataset
} from '../database/queries';
import { normalizeEntityName, areSimilarEntities } from '../utils/helpers';

/**
 * EntityExtractorAgent
 * 
 * Responsibilities:
 * 1. Extract entities from paper content using LLM
 * 2. Disambiguate entity names
 * 3. Validate and score confidence
 * 4. Store entities in database
 */
export class EntityExtractorAgent extends Agent {
  constructor() {
    super('EntityExtractorAgent', 'extractor');
  }
  
  /**
   * Main execution method
   * 
   * Input: { paperId: string, title: string, abstract: string, fullText?: string }
   * Output: ExtractedEntities
   */
  async execute(input: any): Promise<ExtractedEntities> {
    this.log('Starting entity extraction');
    this.validateInput(input, ['paperId', 'title', 'abstract']);
    
    try {
      // Multi-pass extraction strategy
      const entities = await this.extractPass1(input);
      const disambiguated = await this.disambiguateEntities(entities);
      const validated = await this.validateAndScore(disambiguated);
      await this.storeEntities(input.paperId, validated);
      
      this.log(`Extracted ${validated.concepts.length} concepts, ${validated.methods.length} methods, ${validated.datasets.length} datasets`);
      
      return validated;
      
    } catch (error) {
      this.logError('Failed to extract entities', error);
      throw error;
    }
  }
  
  /**
   * Pass 1: Extract entities using LLM with structured prompts
   */
  private async extractPass1(input: any): Promise<ExtractedEntities> {
    this.log('Pass 1: Extracting entities with LLM');
    
    try {
      // Create prompt from template
      const prompt = PromptTemplates.extractEntities(
        input.title,
        input.abstract,
        input.fullText
      );
      
      // Call LLM to extract structured data
      const result = await llmClient.extractStructuredData<ExtractedEntities>(prompt);
      
      this.log(`Extracted: ${result.concepts?.length || 0} concepts, ${result.methods?.length || 0} methods, ${result.datasets?.length || 0} datasets`);
      
      // Ensure all arrays exist
      return {
        concepts: result.concepts || [],
        methods: result.methods || [],
        datasets: result.datasets || [],
        metrics: result.metrics || [],
      };
      
    } catch (error) {
      this.logError('LLM extraction failed', error);
      
      // Return empty entities on failure
      return {
        concepts: [],
        methods: [],
        datasets: [],
        metrics: [],
      };
    }
  }
  
  /**
   * Pass 2: Disambiguate entities by checking for duplicates
   */
  private async disambiguateEntities(entities: ExtractedEntities): Promise<ExtractedEntities> {
    this.log('Pass 2: Disambiguating entities');
    
    try {
      // Disambiguate concepts
      const uniqueConcepts = [];
      for (const concept of entities.concepts) {
        const normalized = normalizeEntityName(concept.name);
        const existing = await getConceptByName(normalized);
        
        if (existing) {
          this.log(`Found existing concept: ${concept.name} -> ${existing.name}`, 'debug');
          // Use existing concept (merge logic could be added here)
          uniqueConcepts.push({
            ...concept,
            name: existing.name,
            normalized_name: existing.normalized_name,
          });
        } else {
          uniqueConcepts.push({
            ...concept,
            normalized_name: normalized,
          });
        }
      }
      
      // Disambiguate methods
      const uniqueMethods = [];
      for (const method of entities.methods) {
        const normalized = normalizeEntityName(method.name);
        const existing = await getMethodByName(normalized);
        
        if (existing) {
          this.log(`Found existing method: ${method.name} -> ${existing.name}`, 'debug');
          uniqueMethods.push({
            ...method,
            name: existing.name,
            normalized_name: existing.normalized_name,
          });
        } else {
          uniqueMethods.push({
            ...method,
            normalized_name: normalized,
          });
        }
      }
      
      // Disambiguate datasets
      const uniqueDatasets = [];
      for (const dataset of entities.datasets) {
        const existing = await getDatasetByName(dataset.name);
        
        if (existing) {
          this.log(`Found existing dataset: ${dataset.name}`, 'debug');
          uniqueDatasets.push({
            ...dataset,
            name: existing.name,
          });
        } else {
          uniqueDatasets.push(dataset);
        }
      }
      
      return {
        concepts: uniqueConcepts,
        methods: uniqueMethods,
        datasets: uniqueDatasets,
        metrics: entities.metrics,
      };
      
    } catch (error) {
      this.logError('Disambiguation failed', error);
      return entities; // Return original on failure
    }
  }
  
  /**
   * Pass 3: Validate and adjust confidence scores
   */
  private async validateAndScore(entities: ExtractedEntities): Promise<ExtractedEntities> {
    this.log('Pass 3: Validating and scoring');
    
    try {
      // Filter out low-confidence concepts
      const validConcepts = entities.concepts.filter(c => {
        // Must have name and description
        if (!c.name || !c.description) return false;
        
        // Must have reasonable confidence
        if (c.confidence < 0.5) return false;
        
        // Adjust confidence based on description length
        if (c.description.length < 20) {
          c.confidence *= 0.8;
        }
        
        return true;
      });
      
      // Filter out incomplete methods
      const validMethods = entities.methods.filter(m => {
        return m.name && m.description && m.description.length > 10;
      });
      
      // Filter out incomplete datasets
      const validDatasets = entities.datasets.filter(d => {
        return d.name && d.description;
      });
      
      this.log(`Validated: ${validConcepts.length} concepts, ${validMethods.length} methods, ${validDatasets.length} datasets`);
      
      return {
        concepts: validConcepts,
        methods: validMethods,
        datasets: validDatasets,
        metrics: entities.metrics,
      };
      
    } catch (error) {
      this.logError('Validation failed', error);
      return entities;
    }
  }
  
  /**
   * Store entities in database
   */
  private async storeEntities(paperId: string, entities: ExtractedEntities): Promise<void> {
    this.log('Storing entities in database');
    
    try {
      // Store concepts
      for (const concept of entities.concepts) {
        try {
          // Check if concept already exists
          let conceptId: string;
          const existing = await getConceptByName(concept.normalized_name || normalizeEntityName(concept.name));
          
          if (existing) {
            conceptId = existing.id;
            this.log(`Using existing concept: ${existing.name}`, 'debug');
          } else {
            // Insert new concept
            const inserted = await insertConcept({
              name: concept.name,
              normalized_name: concept.normalized_name || normalizeEntityName(concept.name),
              description: concept.description,
              category: concept.category,
              first_introduced_by: paperId,
              confidence: concept.confidence,
            });
            conceptId = inserted.id;
            this.log(`Inserted new concept: ${concept.name}`);
          }
          
          // Link paper to concept
          await linkPaperToConcept(paperId, conceptId, concept.confidence);
          
        } catch (error) {
          this.logError(`Failed to store concept: ${concept.name}`, error);
        }
      }
      
      // Store methods
      for (const method of entities.methods) {
        try {
          let methodId: string;
          const existing = await getMethodByName(method.normalized_name || normalizeEntityName(method.name));
          
          if (existing) {
            methodId = existing.id;
          } else {
            const inserted = await insertMethod({
              name: method.name,
              normalized_name: method.normalized_name || normalizeEntityName(method.name),
              description: method.description,
              computational_complexity: method.computational_complexity,
              introduced_in: paperId,
            });
            methodId = inserted.id;
            this.log(`Inserted new method: ${method.name}`);
          }
          
          // Link paper to method
          await linkPaperToMethod(paperId, methodId);
          
        } catch (error) {
          this.logError(`Failed to store method: ${method.name}`, error);
        }
      }
      
      // Store datasets
      for (const dataset of entities.datasets) {
        try {
          let datasetId: string;
          const existing = await getDatasetByName(dataset.name);
          
          if (existing) {
            datasetId = existing.id;
          } else {
            const inserted = await insertDataset({
              name: dataset.name,
              description: dataset.description,
              url: dataset.url,
              introduced_in: paperId,
            });
            datasetId = inserted.id;
            this.log(`Inserted new dataset: ${dataset.name}`);
          }
          
          // Link paper to dataset
          await linkPaperToDataset(paperId, datasetId);
          
        } catch (error) {
          this.logError(`Failed to store dataset: ${dataset.name}`, error);
        }
      }
      
      this.log('✅ All entities stored successfully');
      
    } catch (error) {
      this.logError('Failed to store entities', error);
      throw error;
    }
  }
}