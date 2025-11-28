/**
 * Main entry point for the Gaussian Splatting Knowledge Graph system
 */

import { AgentCoordinator } from './agents/base/Coordinator';
import { PaperReaderAgent } from './agents/PaperReaderAgent';
import { EntityExtractorAgent } from './agents/EntityExtractorAgent';
import { RelationshipMapperAgent } from './agents/RelationshipMapperAgent';
import { ValidatorAgent } from './agents/ValidatorAgent';
import { db } from './database/client';
import { config, validateConfig } from './utils/config';
import { log } from './utils/logger';

/**
 * Initialize the system
 */
async function initialize(): Promise<AgentCoordinator> {
  try {
    // Validate configuration
    validateConfig();
    
    // Test database connection
    log.info('Testing database connection...');
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      throw new Error('Failed to connect to database. Please check your Supabase credentials.');
    }
    
    // Create agent coordinator
    const coordinator = new AgentCoordinator();
    
    // Register all agents
    log.info('Registering agents...');
    coordinator.registerAgent(new PaperReaderAgent());
    coordinator.registerAgent(new EntityExtractorAgent());
    coordinator.registerAgent(new RelationshipMapperAgent());
    coordinator.registerAgent(new ValidatorAgent());
    
    log.info('✅ System initialized successfully');
    
    return coordinator;
    
  } catch (error) {
    log.error('Failed to initialize system', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Gaussian Splatting Knowledge Graph Builder                 ║
║   Agentic System for Academic Research Analysis              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  try {
    // Initialize system
    const coordinator = await initialize();
    
    // Define seed paper (the seminal 3D Gaussian Splatting paper)
    const SEED_PAPER = '2308.04079'; // arXiv ID
    const MAX_PAPERS = config.agent.max_papers_to_process;
    
    log.info('\n📋 Pipeline Configuration:');
    log.info(`   Seed Paper: ${SEED_PAPER}`);
    log.info(`   Max Papers: ${MAX_PAPERS}`);
    log.info(`   LLM Provider: ${config.llm.default_provider}`);
    log.info(`   Model: ${config.llm.default_model}`);
    
    // Execute the full pipeline
    await coordinator.executeFullPipeline(SEED_PAPER, MAX_PAPERS);
    
    // Get final statistics
    log.info('\n📊 Final Statistics:');
    const stats = await db.getStats();
    log.info(`   Papers: ${stats.papers}`);
    log.info(`   Concepts: ${stats.concepts}`);
    log.info(`   Methods: ${stats.methods}`);
    log.info(`   Datasets: ${stats.datasets}`);
    log.info(`   Citations: ${stats.citations}`);
    
    console.log('\n✨ Knowledge graph construction complete!');
    console.log('View your data in Supabase dashboard or run example queries.\n');
    
  } catch (error) {
    log.error('Pipeline execution failed', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { initialize, main };