import dotenv from 'dotenv';
dotenv.config();

import { PaperReaderAgent } from './src/agents/PaperReaderAgent';

async function testPaperReader() {
  console.log('📖 Testing PaperReaderAgent...\n');
  
  try {
    const agent = new PaperReaderAgent();
    
    // Use the famous 3D Gaussian Splatting paper
    // Pass the Semantic Scholar paper ID (we got this from our earlier test)
    const seedPaperId = '2cc1d857e86d5152ba7fe6a8355c2a0150cc280a';
    
    console.log('Fetching papers starting from the 3D Gaussian Splatting paper');
    console.log('This will fetch 5 papers (to keep it quick for testing)...\n');
    
    const result = await agent.execute({ 
      seedPaper: seedPaperId,
      limit: 5  // Just 5 papers for quick test
    });
    
    console.log(`\n✅ Fetched ${result.length} papers!\n`);
    
    result.forEach((paper: any, index: number) => {
      console.log(`${index + 1}. ${paper.title}`);
      console.log(`   ArXiv: ${paper.arxiv_id || 'N/A'}`);
      console.log('');
    });
    
    console.log('✅ PaperReaderAgent is working!');
    
  } catch (error: any) {
    console.error('❌ PaperReaderAgent test failed:', error.message);
    process.exit(1);
  }
}

testPaperReader();