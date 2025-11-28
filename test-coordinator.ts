import dotenv from 'dotenv';
dotenv.config();

import { AgentCoordinator } from './src/agents/AgentCoordinator';

async function testCoordinator() {
  console.log('🎯 Testing AgentCoordinator (Full Orchestration)...\n');
  
  try {
    const coordinator = new AgentCoordinator();
    
    // Test with 3 papers for a quick but comprehensive test
    console.log('Starting knowledge graph construction...');
    console.log('Target: Process 3 papers related to 3D Gaussian Splatting');
    console.log('This will take 3-5 minutes...\n');
    
    const result = await coordinator.buildKnowledgeGraph({
      seedPaper: '2308.04079', // 3D Gaussian Splatting arXiv ID
      maxPapers: 3,
      enableValidation: true,
    });
    
    console.log('\n🎉 Knowledge Graph Construction Complete!\n');
    console.log('='.repeat(60));
    console.log('RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Papers Processed:     ${result.stats.papersProcessed}`);
    console.log(`Concepts Extracted:   ${result.stats.conceptsExtracted}`);
    console.log(`Methods Extracted:    ${result.stats.methodsExtracted}`);
    console.log(`Datasets Extracted:   ${result.stats.datasetsExtracted}`);
    console.log(`Relationships Mapped: ${result.stats.relationshipsMapped}`);
    console.log(`Errors:               ${result.stats.errors}`);
    console.log('='.repeat(60));
    
    if (result.papers && result.papers.length > 0) {
      console.log('\nProcessed Papers:');
      result.papers.forEach((paper: any, index: number) => {
        console.log(`${index + 1}. ${paper.title || 'Unknown'}`);
      });
    }
    
    console.log('\n✅ AgentCoordinator test completed successfully!');
    console.log('✅ All agents working together in harmony!');
    
  } catch (error: any) {
    console.error('\n❌ Coordinator test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCoordinator();