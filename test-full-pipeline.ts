import dotenv from 'dotenv';
dotenv.config();

import { arxiv } from './src/ingestion/arxiv';
import { pdfParser } from './src/ingestion/pdf-parser';
import { insertPaper, getPaperByArxivId } from './src/database/queries';
import { EntityExtractorAgent } from './src/agents/EntityExtractorAgent';
import { RelationshipMapperAgent } from './src/agents/RelationshipMapperAgent';

async function testFullPipeline() {
  console.log('🚀 Testing Full Pipeline with arXiv...\n');
  
  try {
    const arxivId = '2308.04079'; // 3D Gaussian Splatting paper
    
    // Step 1: Get or create paper in database
    console.log('Step 1: Getting or creating paper in database...');
    
    let storedPaper = await getPaperByArxivId(arxivId);
    
    if (!storedPaper) {
      storedPaper = await insertPaper({
        title: '3D Gaussian Splatting for Real-Time Radiance Field Rendering',
        arxiv_id: arxivId,
        abstract: 'Radiance Field methods have recently revolutionized novel-view synthesis...',
        published_date: new Date('2023-08-07'),
        pdf_url: arxiv.getPDFUrl(arxivId),
        authors_json: [
          { name: 'Bernhard Kerbl' },
          { name: 'Georgios Kopanas' },
          { name: 'Thomas Leimkühler' },
        ],
      });
      
      if (!storedPaper) {
        throw new Error('Failed to create paper');
      }
      
      console.log('✅ Paper created with ID:', storedPaper.id);
    } else {
      console.log('✅ Paper already exists with ID:', storedPaper.id);
    }
    
    console.log('   Title:', storedPaper.title);
    
    // Step 2: Download and parse PDF
    console.log('\nStep 2: Downloading and parsing PDF...');
    console.log('(This may take 1-2 minutes...)');
    
    const pdfPath = await arxiv.downloadPDFIfNeeded(arxivId);
    console.log('✅ PDF downloaded to:', pdfPath);
    
    const analysis = await pdfParser.analyzePaper(pdfPath);
    console.log('✅ PDF parsed successfully');
    console.log('   Text length:', analysis.text.length, 'characters');
    
    // Step 3: Extract entities with EntityExtractorAgent
    console.log('\nStep 3: Extracting entities with LLM...');
    console.log('(This may take 30-60 seconds...)');
    
    const extractorAgent = new EntityExtractorAgent();
    
    const entities = await extractorAgent.execute({
      paperId: storedPaper.id,
      title: storedPaper.title,
      abstract: storedPaper.abstract || '',
      text: analysis.text.substring(0, 10000),
    });
    
    console.log('✅ Entities extracted:');
    console.log('   Concepts:', entities.concepts?.length || 0);
    console.log('   Methods:', entities.methods?.length || 0);
    console.log('   Datasets:', entities.datasets?.length || 0);
    
    // Display some extracted concepts
    if (entities.concepts && entities.concepts.length > 0) {
      console.log('\n   Sample Concepts:');
      entities.concepts.slice(0, 3).forEach((c: any, i: number) => {
        console.log(`   ${i + 1}. ${c.name} (confidence: ${c.confidence})`);
      });
    }
    
    // Step 4: Map relationships
    console.log('\nStep 4: Mapping relationships...');
    const mapperAgent = new RelationshipMapperAgent();
    
    const relationships = await mapperAgent.execute({
      paperId: storedPaper.id,
      entities,
    });
    
    console.log('✅ Relationships mapped:');
    console.log('   Improvements:', relationships.improvements?.length || 0);
    console.log('   Citations:', relationships.citations?.length || 0);
    
    console.log('\n🎉 Full pipeline test completed successfully!');
    console.log('\nSummary:');
    console.log('✅ Paper stored in database');
    console.log('✅ PDF downloaded and parsed');
    console.log('✅ Entities extracted with LLM');
    console.log('✅ Relationships mapped');
    console.log('\nYou can now query your Supabase database to see the stored data!');
    
  } catch (error: any) {
    console.error('\n❌ Pipeline test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFullPipeline();