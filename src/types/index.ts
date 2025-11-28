/**
 * Core type definitions for the Knowledge Graph system
 */

// ============================================================================
// Database Schema Types
// ============================================================================

export interface Paper {
    id: string;
    title: string;
    arxiv_id?: string;
    semantic_scholar_id?: string;
    abstract?: string;
    published_date?: Date;
    pdf_url?: string;
    pdf_text?: string;
    authors_json?: Author[];
    created_at: Date;
    updated_at: Date;
  }
  
  export interface Concept {
    id: string;
    name: string;
    normalized_name: string;
    description?: string;
    category?: 'technique' | 'architecture' | 'loss_function' | 'representation' | 'other';
    first_introduced_by?: string;
    confidence: number;
    created_at: Date;
  }
  
  export interface Method {
    id: string;
    name: string;
    normalized_name: string;
    description?: string;
    computational_complexity?: string;
    introduced_in?: string;
    created_at: Date;
  }
  
  export interface Dataset {
    id: string;
    name: string;
    description?: string;
    url?: string;
    introduced_in?: string;
    created_at: Date;
  }
  
  export interface Author {
    id?: string;
    name: string;
    normalized_name?: string;
    affiliation?: string;
    h_index?: number;
    created_at?: Date;
  }
  
  // ============================================================================
  // Relationship Types
  // ============================================================================
  
  export interface PaperCitation {
    id: string;
    source_paper: string;
    target_paper: string;
    citation_context?: string;
    created_at: Date;
  }
  
  export interface ConceptImprovement {
    id: string;
    new_concept: string;
    old_concept: string;
    improvement_type: 'speed' | 'quality' | 'generalization' | 'simplicity';
    quantitative_gain?: Record<string, any>;
    confidence: number;
    created_at: Date;
  }
  
  // ============================================================================
  // Agent System Types
  // ============================================================================
  
  export type AgentType = 'reader' | 'extractor' | 'mapper' | 'validator';
  
  export interface AgentMessage {
    id: string;
    type: 'task' | 'result' | 'error';
    from: string;
    to: string;
    payload: any;
    metadata: {
      timestamp: Date;
      priority: number;
      retries: number;
    };
  }
  
  export interface AgentTask {
    id: string;
    agentType: AgentType;
    input: any;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: any;
    error?: string;
    created_at: Date;
    completed_at?: Date;
  }
  
  // ============================================================================
  // Entity Extraction Types
  // ============================================================================
  
  export interface ExtractedEntities {
    concepts: ExtractedConcept[];
    methods: ExtractedMethod[];
    datasets: ExtractedDataset[];
    metrics: ExtractedMetric[];
  }
  
  export interface ExtractedConcept {
    name: string;
    normalized_name?: string; 
    description: string;
    type: 'fundamental' | 'technique' | 'application' | 'component' | 'metric';
    category?: 'technique' | 'architecture' | 'loss_function' | 'representation' | 'other';
    confidence: number;
    context?: string;
  }
  
  export interface ExtractedMethod {
    name: string;
    normalized_name?: string;
    description: string;
    type: 'algorithm' | 'technique' | 'optimization' | 'rendering' | 'training';
    computational_complexity?: string;
    confidence: number;
    context?: string;
  }
  
  export interface ExtractedDataset {
    name: string;
    description: string;
    url?: string;
  }
  
  export interface ExtractedMetric {
    name: string;
    value?: string | number;
    unit?: string;
  }
  
  // ============================================================================
  // External API Types
  // ============================================================================
  
  export interface SemanticScholarPaper {
    paperId: string;
    externalIds?: {
      ArXiv?: string;
      DOI?: string;
    };
    title: string;
    abstract?: string;
    year?: number;
    authors: Array<{
      authorId: string;
      name: string;
    }>;
    citationCount?: number;
    referenceCount?: number;
    citations?: SemanticScholarPaper[];
    references?: SemanticScholarPaper[];
    publicationDate?: string;
    openAccessPdf?: {
      url: string;
      status: string;
    };
  }
  
  export interface ArxivPaper {
    id: string;
    title: string;
    summary: string;
    authors: string[];
    published: Date;
    updated: Date;
    pdf_url: string;
    categories: string[];
  }
  
  // ============================================================================
  // LLM Types
  // ============================================================================
  
  export interface LLMConfig {
    provider: 'openai' | 'anthropic';
    model: string;
    temperature?: number;
    max_tokens?: number;
    response_format?: {
      type: 'json_object' | 'text';
    };
  }
  
  export interface LLMResponse {
    content: string;
    model: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }
  
  // ============================================================================
  // Configuration Types
  // ============================================================================
  
  export interface SystemConfig {
    supabase: {
      url: string;
      key: string;
      serviceKey: string;
    };
    llm: {
      openai_api_key: string;
      anthropic_api_key: string;
      default_provider: 'openai' | 'anthropic';
      default_model: string;
    };
    agent: {
      max_papers_to_process: number;
      max_concurrent_agents: number;
      retry_attempts: number;
      timeout_ms: number;
    };
    logging: {
      level: 'debug' | 'info' | 'warn' | 'error';
    };
  }
  
  // ============================================================================
  // Utility Types
  // ============================================================================
  
  export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }
  
  export interface OperationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: Date;
  }