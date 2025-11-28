/**
 * Prompt templates for LLM-based entity extraction and relationship mapping
 */

export const PromptTemplates = {
    /**
     * Extract entities from a research paper
     */
    extractEntities: (title: string, abstract: string, fullText?: string) => `
  You are an expert in computer graphics and 3D reconstruction research.
  
  Extract key entities from this research paper:
  
  **Title:** ${title}
  
  **Abstract:** ${abstract}
  
  ${fullText ? `**Full Text:** ${fullText.slice(0, 3000)}...` : ''}
  
  Extract the following entities and return them as JSON:
  
  {
    "concepts": [
      {
        "name": "exact name of the concept",
        "description": "brief description of what it is",
        "category": "technique|architecture|loss_function|representation|other",
        "confidence": 0.95
      }
    ],
    "methods": [
      {
        "name": "exact name of the method",
        "description": "what the method does",
        "computational_complexity": "O(n) or textual description if mentioned"
      }
    ],
    "datasets": [
      {
        "name": "exact dataset name",
        "description": "what the dataset contains",
        "url": "dataset URL if mentioned"
      }
    ],
    "metrics": [
      {
        "name": "metric name (e.g., PSNR, SSIM, FPS)",
        "value": "numerical value if mentioned",
        "unit": "unit (dB, seconds, etc.)"
      }
    ]
  }
  
  **Instructions:**
  - Focus on NOVEL contributions and key technical components introduced in THIS paper
  - Only extract concepts that are clearly explained in the paper
  - Assign high confidence (>0.9) only to concepts explicitly introduced or central to the paper
  - For concepts mentioned but not central, assign lower confidence (0.5-0.8)
  - Be precise with names - use the exact terminology from the paper
  - Exclude generic concepts like "deep learning" or "neural networks" unless they're modified (e.g., "deep learning with custom architecture")
  
  Return ONLY valid JSON, no other text.
  `,
  
    /**
     * Classify relationship between two concepts
     */
    classifyRelationship: (
      newConcept: { name: string; description: string; year?: number },
      oldConcept: { name: string; description: string; year?: number }
    ) => `
  You are an expert in analyzing relationships between research concepts.
  
  Compare these two concepts from different research papers:
  
  **New Concept (${newConcept.year || 'recent'}):**
  Name: ${newConcept.name}
  Description: ${newConcept.description}
  
  **Old Concept (${oldConcept.year || 'earlier'}):**
  Name: ${oldConcept.name}
  Description: ${oldConcept.description}
  
  Determine:
  1. Does the new concept improve upon, extend, or build on the old concept?
  2. If yes, what type of relationship exists?
  3. Are there quantitative improvements mentioned?
  
  Return JSON:
  {
    "has_relationship": true/false,
    "relationship_type": "improves_on|extends|uses|evaluates|null",
    "improvement_category": "speed|quality|generalization|simplicity|null",
    "quantitative_gain": {
      "metric_name": "improvement_description"
    },
    "confidence": 0.85,
    "explanation": "brief explanation of the relationship"
  }
  
  **Relationship Types:**
  - "improves_on": New concept makes the old concept better (faster, higher quality, etc.)
  - "extends": New concept adds capabilities to the old concept
  - "uses": New concept uses the old concept as a component
  - "evaluates": New concept evaluates or benchmarks against the old concept
  
  Return ONLY valid JSON, no other text.
  `,
  
    /**
     * Classify citation relationship
     */
    classifyCitation: (
      citingPaper: { title: string; abstract: string },
      citedPaper: { title: string; abstract: string }
    ) => `
  Analyze why this paper cites another paper:
  
  **Citing Paper:**
  ${citingPaper.title}
  ${citingPaper.abstract}
  
  **Cited Paper:**
  ${citedPaper.title}
  ${citedPaper.abstract}
  
  Determine the citation context and return JSON:
  
  {
    "citation_type": "builds_on|compares_to|uses_method|uses_dataset|background|other",
    "context": "brief description of why cited",
    "confidence": 0.9
  }
  
  **Citation Types:**
  - "builds_on": Citing paper directly builds on or extends the cited work
  - "compares_to": Citing paper compares results to the cited work
  - "uses_method": Citing paper uses a method from the cited work
  - "uses_dataset": Citing paper uses a dataset from the cited work
  - "background": General background citation
  - "other": Other relationship
  
  Return ONLY valid JSON, no other text.
  `,
  
    /**
     * Disambiguate entity names
     */
    disambiguateEntities: (entities: Array<{ name: string; description: string }>) => `
  You are helping to deduplicate entities extracted from multiple research papers.
  
  Here are entities that might refer to the same concept:
  
  ${entities.map((e, i) => `${i + 1}. ${e.name}\n   Description: ${e.description}`).join('\n\n')}
  
  Return JSON indicating which entities refer to the same concept:
  
  {
    "groups": [
      {
        "canonical_name": "the best/most common name to use",
        "entity_indices": [1, 3],
        "confidence": 0.95
      }
    ],
    "explanation": "brief explanation of grouping decisions"
  }
  
  **Instructions:**
  - Group entities that refer to the same concept despite different naming
  - The canonical_name should be the most widely used or clearest name
  - Only group entities if you're confident they're the same (>0.8)
  - Entities not in any group are considered unique
  
  Return ONLY valid JSON, no other text.
  `,
  
    /**
     * Validate extracted entities
     */
    validateExtraction: (
      paper: { title: string; abstract: string },
      entities: { concepts: any[]; methods: any[]; datasets: any[] }
    ) => `
  You are validating entity extraction from a research paper.
  
  **Paper:**
  ${paper.title}
  ${paper.abstract}
  
  **Extracted Entities:**
  ${JSON.stringify(entities, null, 2)}
  
  Check if:
  1. All extracted entities are actually mentioned in the paper
  2. Descriptions are accurate
  3. No major entities were missed
  
  Return JSON:
  {
    "is_valid": true/false,
    "issues": [
      {
        "entity_type": "concept|method|dataset",
        "entity_name": "name",
        "issue": "description of the problem"
      }
    ],
    "missing_entities": [
      {
        "type": "concept|method|dataset",
        "name": "suggested name",
        "reason": "why it should be included"
      }
    ],
    "confidence": 0.9
  }
  
  Return ONLY valid JSON, no other text.
  `,
  };
  
  /**
   * Helper function to format prompt with token limit awareness
   */
  export function formatPromptWithLimit(
    template: string,
    maxTokens: number = 4000
  ): string {
    // Rough estimate: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    
    if (template.length > maxChars) {
      return template.slice(0, maxChars) + '\n\n[Text truncated due to length...]';
    }
    
    return template;
  }