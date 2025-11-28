import { Agent } from './base/Agent';
import { db } from '../database/client';
import { areSimilarEntities } from '../utils/helpers';

/**
 * ValidatorAgent
 * 
 * Responsibilities:
 * 1. Validate extracted entities
 * 2. Check for duplicates
 * 3. Ensure graph consistency
 * 4. Resolve conflicts
 */
export class ValidatorAgent extends Agent {
  constructor() {
    super('ValidatorAgent', 'validator');
  }
  
  /**
   * Main execution method
   * 
   * Input: { paperId: string, entities: any, relationships: any }
   * Output: Validation results
   */
  async execute(input: any): Promise<any> {
    this.log('Starting validation');
    this.validateInput(input, ['paperId', 'entities', 'relationships']);
    
    try {
      const results = {
        duplicates: await this.checkDuplicates(input.entities),
        consistency: await this.checkConsistency(input.paperId),
        conflicts: await this.resolveConflicts(input.paperId),
        isValid: true,
      };
      
      // Mark as invalid if critical issues found
      if (results.duplicates.length > 5 || !results.consistency) {
        results.isValid = false;
        this.log('⚠️ Validation found critical issues', 'warn');
      } else {
        this.log('✅ Validation passed');
      }
      
      return results;
      
    } catch (error) {
      this.logError('Validation failed', error);
      throw error;
    }
  }
  
  /**
   * Check for duplicate entities
   * 
   * Look for:
   * - Same normalized name but different IDs
   * - Very similar descriptions
   */
  private async checkDuplicates(entities: any): Promise<any[]> {
    this.log('Checking for duplicates');
    
    const duplicates: any[] = [];
    
    try {
      // Check concept duplicates
      const { data: allConcepts } = await db.getClient()
        .from('concepts')
        .select('id, name, normalized_name');
      
      if (allConcepts) {
        // Group by normalized name
        const conceptGroups = new Map<string, any[]>();
        
        for (const concept of allConcepts) {
          const normalized = concept.normalized_name;
          if (!conceptGroups.has(normalized)) {
            conceptGroups.set(normalized, []);
          }
          conceptGroups.get(normalized)!.push(concept);
        }
        
        // Find groups with multiple concepts
        for (const [normalized, concepts] of conceptGroups) {
          if (concepts.length > 1) {
            duplicates.push({
              type: 'concept',
              normalized_name: normalized,
              count: concepts.length,
              concepts: concepts.map(c => ({ id: c.id, name: c.name })),
            });
            
            this.log(`Found ${concepts.length} duplicate concepts: ${normalized}`, 'warn');
          }
        }
      }
      
      // Check method duplicates
      const { data: allMethods } = await db.getClient()
        .from('methods')
        .select('id, name, normalized_name');
      
      if (allMethods) {
        const methodGroups = new Map<string, any[]>();
        
        for (const method of allMethods) {
          const normalized = method.normalized_name;
          if (!methodGroups.has(normalized)) {
            methodGroups.set(normalized, []);
          }
          methodGroups.get(normalized)!.push(method);
        }
        
        for (const [normalized, methods] of methodGroups) {
          if (methods.length > 1) {
            duplicates.push({
              type: 'method',
              normalized_name: normalized,
              count: methods.length,
              methods: methods.map(m => ({ id: m.id, name: m.name })),
            });
            
            this.log(`Found ${methods.length} duplicate methods: ${normalized}`, 'warn');
          }
        }
      }
      
      // Check for similar but not exact duplicates
      await this.checkSimilarEntities(allConcepts || [], duplicates);
      
      return duplicates;
      
    } catch (error) {
      this.logError('Failed to check duplicates', error);
      return duplicates;
    }
  }
  
  /**
   * Check for similar entities with different names
   */
  private async checkSimilarEntities(entities: any[], duplicates: any[]): Promise<void> {
    try {
      // Compare all pairs of entities
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const entity1 = entities[i];
          const entity2 = entities[j];
          
          // Skip if already flagged as exact duplicates
          if (entity1.normalized_name === entity2.normalized_name) {
            continue;
          }
          
          // Check similarity
          if (areSimilarEntities(entity1.name, entity2.name, 0.85)) {
            duplicates.push({
              type: 'similar_concept',
              similarity: 'high',
              entities: [
                { id: entity1.id, name: entity1.name },
                { id: entity2.id, name: entity2.name },
              ],
            });
            
            this.log(`Found similar concepts: "${entity1.name}" vs "${entity2.name}"`, 'debug');
          }
        }
      }
    } catch (error) {
      this.logError('Failed to check similar entities', error);
    }
  }
  
  /**
   * Check graph consistency
   * 
   * Verify:
   * - All referenced entities exist
   * - No orphaned relationships
   * - Confidence scores are valid
   */
  private async checkConsistency(paperId: string): Promise<boolean> {
    this.log('Checking consistency');
    
    try {
      let isConsistent = true;
      
      // Check paper exists
      const { data: paper } = await db.getClient()
        .from('papers')
        .select('id')
        .eq('id', paperId)
        .single();
      
      if (!paper) {
        this.log('Paper not found in database', 'error');
        return false;
      }
      
      // Check paper_introduces_concept relationships
      const { data: conceptLinks } = await db.getClient()
        .from('paper_introduces_concept')
        .select(`
          paper_id,
          concept_id,
          confidence,
          concepts (id)
        `)
        .eq('paper_id', paperId);
      
      if (conceptLinks) {
        for (const link of conceptLinks) {
          // Check confidence is valid
          if (link.confidence < 0 || link.confidence > 1) {
            this.log(`Invalid confidence score: ${link.confidence}`, 'warn');
            isConsistent = false;
          }
          
          // Check concept exists
          if (!link.concepts) {
            this.log(`Orphaned concept link: ${link.concept_id}`, 'warn');
            isConsistent = false;
          }
        }
      }
      
      // Check concept_improves_concept relationships
      const { data: improvements } = await db.getClient()
        .from('concept_improves_concept')
        .select(`
          new_concept,
          old_concept,
          confidence,
          new:concepts!concept_improves_concept_new_concept_fkey (id),
          old:concepts!concept_improves_concept_old_concept_fkey (id)
        `);
      
      if (improvements) {
        for (const improvement of improvements) {
          // Check both concepts exist
          if (!improvement.new || !improvement.old) {
            this.log('Orphaned improvement relationship', 'warn');
            isConsistent = false;
          }
          
          // Check confidence is valid
          if (improvement.confidence < 0 || improvement.confidence > 1) {
            this.log(`Invalid improvement confidence: ${improvement.confidence}`, 'warn');
            isConsistent = false;
          }
          
          // Check for self-improvement (concept improving itself)
          if (improvement.new_concept === improvement.old_concept) {
            this.log('Self-improvement detected (concept improving itself)', 'warn');
            isConsistent = false;
          }
        }
      }
      
      return isConsistent;
      
    } catch (error) {
      this.logError('Failed to check consistency', error);
      return false;
    }
  }
  
  /**
   * Resolve conflicts in extracted data
   * 
   * Handle:
   * - Conflicting entity descriptions
   * - Duplicate relationships
   * - Invalid confidence scores
   */
  private async resolveConflicts(paperId: string): Promise<any[]> {
    this.log('Resolving conflicts');
    
    const conflicts: any[] = [];
    
    try {
      // Check for duplicate paper_introduces_concept links
      const { data: conceptLinks } = await db.getClient()
        .from('paper_introduces_concept')
        .select('paper_id, concept_id, count')
        .eq('paper_id', paperId);
      
      // Group by concept_id to find duplicates
      const conceptCounts = new Map<string, number>();
      
      if (conceptLinks) {
        for (const link of conceptLinks) {
          const count = conceptCounts.get(link.concept_id) || 0;
          conceptCounts.set(link.concept_id, count + 1);
        }
        
        // Find duplicates
        for (const [conceptId, count] of conceptCounts) {
          if (count > 1) {
            conflicts.push({
              type: 'duplicate_link',
              entity: 'concept',
              conceptId,
              count,
            });
            
            this.log(`Duplicate paper-concept link detected: ${conceptId} (${count} times)`, 'warn');
          }
        }
      }
      
      // Check for circular improvement chains
      await this.checkCircularImprovements(conflicts);
      
      return conflicts;
      
    } catch (error) {
      this.logError('Failed to resolve conflicts', error);
      return conflicts;
    }
  }
  
  /**
   * Check for circular improvement chains (A improves B improves A)
   */
  private async checkCircularImprovements(conflicts: any[]): Promise<void> {
    try {
      const { data: improvements } = await db.getClient()
        .from('concept_improves_concept')
        .select('new_concept, old_concept');
      
      if (!improvements) return;
      
      // Build adjacency list
      const graph = new Map<string, string[]>();
      
      for (const imp of improvements) {
        if (!graph.has(imp.new_concept)) {
          graph.set(imp.new_concept, []);
        }
        graph.get(imp.new_concept)!.push(imp.old_concept);
      }
      
      // Check for cycles using DFS
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      
      const hasCycle = (node: string): boolean => {
        visited.add(node);
        recursionStack.add(node);
        
        const neighbors = graph.get(node) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor)) return true;
          } else if (recursionStack.has(neighbor)) {
            return true; // Cycle detected
          }
        }
        
        recursionStack.delete(node);
        return false;
      };
      
      for (const node of graph.keys()) {
        if (!visited.has(node)) {
          if (hasCycle(node)) {
            conflicts.push({
              type: 'circular_improvement',
              message: 'Circular improvement chain detected',
            });
            
            this.log('⚠️ Circular improvement chain detected', 'warn');
          }
        }
      }
      
    } catch (error) {
      this.logError('Failed to check circular improvements', error);
    }
  }
}