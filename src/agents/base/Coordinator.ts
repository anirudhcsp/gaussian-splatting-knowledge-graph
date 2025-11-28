import PQueue from 'p-queue';
import { Agent } from './Agent';
import { AgentType, AgentMessage } from '../../types';
import { log } from '../../utils/logger';
import { config } from '../../utils/config';

/**
 * Coordinates multiple agents and manages their execution
 * 
 * Responsibilities:
 * - Register and manage agents
 * - Orchestrate multi-agent workflows
 * - Handle message passing between agents
 * - Manage concurrent execution with queuing
 */
export class AgentCoordinator {
  private agents: Map<AgentType, Agent>;
  private messageQueue: AgentMessage[];
  private executionQueue: PQueue;
  
  constructor() {
    this.agents = new Map();
    this.messageQueue = [];
    
    // Initialize execution queue with concurrency limit
    this.executionQueue = new PQueue({
      concurrency: config.agent.max_concurrent_agents,
      timeout: config.agent.timeout_ms,
    });
    
    log.info('Agent Coordinator initialized', {
      maxConcurrency: config.agent.max_concurrent_agents,
      timeout: config.agent.timeout_ms,
    });
  }
  
  /**
   * Register an agent with the coordinator
   */
  registerAgent(agent: Agent): void {
    const type = agent.getType();
    
    if (this.agents.has(type)) {
      log.warn(`Agent ${type} is already registered, replacing...`);
    }
    
    this.agents.set(type, agent);
    log.info(`Registered agent: ${agent.getName()} (${type})`);
  }
  
  /**
   * Get a registered agent by type
   */
  getAgent(type: AgentType): Agent | undefined {
    return this.agents.get(type);
  }
  
  /**
   * Check if all required agents are registered
   */
  validateAgents(required: AgentType[]): void {
    const missing = required.filter(type => !this.agents.has(type));
    
    if (missing.length > 0) {
      throw new Error(`Missing required agents: ${missing.join(', ')}`);
    }
  }
  
  /**
   * Orchestrate the complete pipeline for processing a single paper
   * 
   * Pipeline: Reader → Extractor → Mapper → Validator
   */
  async orchestratePaperProcessing(paperId: string): Promise<any> {
    log.info(`Orchestrating paper processing pipeline for: ${paperId}`);
    
    this.validateAgents(['reader', 'extractor', 'mapper', 'validator']);
    
    try {
      // Step 1: Parse paper content
      log.info(`Step 1/4: Reading paper ${paperId}`);
      const paperData = await this.agents.get('reader')!.executeTask({ paperId });
      
      // Step 2: Extract entities
      log.info(`Step 2/4: Extracting entities from ${paperId}`);
      const entities = await this.agents.get('extractor')!.executeTask(paperData);
      
      // Step 3: Map relationships
      log.info(`Step 3/4: Mapping relationships for ${paperId}`);
      const relationships = await this.agents.get('mapper')!.executeTask({
        paperId,
        entities,
      });
      
      // Step 4: Validate results
      log.info(`Step 4/4: Validating results for ${paperId}`);
      await this.agents.get('validator')!.executeTask({
        paperId,
        entities,
        relationships,
      });
      
      log.info(`✅ Successfully processed paper: ${paperId}`);
      
      return {
        paperId,
        entities,
        relationships,
        status: 'completed',
      };
      
    } catch (error) {
      log.error(`Failed to process paper: ${paperId}`, error);
      throw error;
    }
  }
  
  /**
   * Process multiple papers concurrently with queue management
   */
  async processPapersBatch(paperIds: string[]): Promise<any[]> {
    log.info(`Processing batch of ${paperIds.length} papers`);
    
    const results = await Promise.allSettled(
      paperIds.map(paperId =>
        this.executionQueue.add(() => this.orchestratePaperProcessing(paperId))
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    log.info(`Batch processing complete: ${successful} successful, ${failed} failed`);
    
    return results;
  }
  
  /**
   * Execute the complete knowledge graph construction pipeline
   */
  async executeFullPipeline(seedPaper: string, limit: number = 50): Promise<void> {
    log.info('🚀 Starting full knowledge graph construction pipeline');
    log.info(`Seed paper: ${seedPaper}`);
    log.info(`Target papers: ${limit}`);
    
    try {
      // Step 1: Fetch related papers
      log.info('\n📚 Phase 1: Fetching related papers...');
      const papers = await this.agents.get('reader')!.executeTask({
        seedPaper,
        limit,
      });
      
      log.info(`Found ${papers.length} papers`);
      
      // Step 2: Process all papers
      log.info('\n🔍 Phase 2: Processing papers...');
      const paperIds = papers.map((p: any) => p.id);
      const results = await this.processPapersBatch(paperIds);
      
      const successful = results.filter((r: any) => r.status === 'fulfilled').length;
      
      log.info('\n✨ Knowledge graph construction complete!');
      log.info(`Total papers processed: ${successful}/${papers.length}`);
      
    } catch (error) {
      log.error('Pipeline execution failed', error);
      throw error;
    }
  }
  
  /**
   * Get statistics about agent execution
   */
  getStats() {
    return {
      registeredAgents: this.agents.size,
      queueSize: this.executionQueue.size,
      pendingTasks: this.executionQueue.pending,
      agentTypes: Array.from(this.agents.keys()),
    };
  }
  
  /**
   * Clear the execution queue
   */
  clearQueue(): void {
    this.executionQueue.clear();
    log.info('Execution queue cleared');
  }
}