import dotenv from 'dotenv';
dotenv.config();

import { semanticScholar } from './src/ingestion/semantic-scholar';

async function testSemanticScholar() {
  console.log('📚 Testing Semantic Scholar API...\n');
  
  try {
    // Search for a well-known Gaussian Splatting paper
    console.log('Searching for "3D Gaussian Splatting" papers...');
    
    const papers = await semanticScholar.searchPapers('3D Gaussian Splatting', 3);
    
    if (papers.length === 0) {
      console.log('⚠️  No papers found');
      return;
    }
    
    console.log(`✅ Found ${papers.length} papers:\n`);
    
    papers.forEach((paper: any, index: number) => {
      console.log(`${index + 1}. ${paper.title}`);
      console.log(`   Paper ID: ${paper.paperId}`);
      console.log(`   ArXiv: ${paper.externalIds?.ArXiv || 'N/A'}`);
      console.log(`   Citations: ${paper.citationCount || 0}`);
      console.log('');
    });
    
    console.log('✅ Semantic Scholar API is working!');
    
  } catch (error: any) {
    console.error('❌ Semantic Scholar test failed:', error.message);
    process.exit(1);
  }
}

testSemanticScholar();