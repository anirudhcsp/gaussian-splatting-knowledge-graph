import dotenv from 'dotenv';
dotenv.config();

import { arxiv } from './src/ingestion/arxiv';
import { pdfParser } from './src/ingestion/pdf-parser';
import { insertPaper, getPaperByArxivId } from './src/database/queries';
import { EntityExtractorAgent } from './src/agents/EntityExtractorAgent';
import { RelationshipMapperAgent } from './src/agents/RelationshipMapperAgent';

// List of 3D Gaussian Splatting related papers
const PAPERS = [
  { 
    arxivId: '2308.04079',
    title: '3D Gaussian Splatting for Real-Time Radiance Field Rendering',
    abstract: 'Radiance Field methods have recently revolutionized novel-view synthesis...'
  },
  {
    arxivId: '2403.14627',
    title: 'MVSplat: Efficient 3D Gaussian Splatting from Sparse Multi-View Images',
    abstract: 'We introduce MVSplat, a feed-forward 3D Gaussian Splatting model...'
  },
  {
    arxivId: '2312.02121',
    title: 'Mip-Splatting: Alias-free 3D Gaussian Splatting',
    abstract: 'We present Mip-Splatting, a technique for anti-aliased 3D Gaussian Splatting...'
  },
  {
    arxivId: '2311.13398',
    title: 'GaussianShader: 3D Gaussian Splatting with Shading Functions for Reflective Surfaces',
    abstract: 'We introduce GaussianShader, a novel method for material and lighting decomposition...'
  },
  {
    arxivId: '2401.00825',
    title: '4D Gaussian Splatting for Real-Time Dynamic Scene Rendering',
    abstract: 'We present 4D Gaussian Splatting (4DGS) for dynamic scene rendering...'
  },
];

async function batchProcessPapers() {
  console.log('🚀 Batch Processing Papers to Build Knowledge Graph\n');
  console.log('='.repeat(70));
  console.log(`Total Papers to Process: ${PAPERS.length}`);
  console.log('Estimated Time: 10-15 minutes');
  console.log('='.repeat(70));
  console.log('');
  
  const stats = {
    papersProcessed: 0,
    papersSkipped: 0,
    conceptsExtracted: 0,
    methodsExtracted: 0,
    datasetsExtracted: 0,
    relationshipsMapped: 0,
    errors: 0,
  };
  
  const extractorAgent = new EntityExtractorAgent();
  const mapperAgent = new RelationshipMapperAgent();
  
  for (let i = 0; i < PAPERS.length; i++) {
    const paper = PAPERS[i];
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[${i + 1}/${PAPERS.length}] Processing: ${paper.title}`);
    console.log(`${'='.repeat(70)}`);
    
    try {
      // Step 1: Get or create paper
      console.log('  📄 Step 1: Storing paper in database...');
      let storedPaper = await getPaperByArxivId(paper.arxivId);
      
      if (!storedPaper) {
        storedPaper = await insertPaper({
          title: paper.title,
          arxiv_id: paper.arxivId,
          abstract: paper.abstract,
          pdf_url: arxiv.getPDFUrl(paper.arxivId),
          authors_json: [],
        });
        
        if (!storedPaper) {
          throw new Error('Failed to create paper');
        }
        console.log('     ✅ Paper created');
      } else {
        console.log('     ✅ Paper already exists');
      }
      
      // Step 2: Download and parse PDF
      console.log('  📥 Step 2: Downloading and parsing PDF...');
      const pdfPath = await arxiv.downloadPDFIfNeeded(paper.arxivId);
      const analysis = await pdfParser.analyzePaper(pdfPath);
      console.log(`     ✅ PDF parsed (${analysis.text.length} chars)`);
      
      // Step 3: Extract entities
      console.log('  🤖 Step 3: Extracting entities with LLM...');
      const entities = await extractorAgent.execute({
        paperId: storedPaper.id,
        title: storedPaper.title,
        abstract: storedPaper.abstract || '',
        text: analysis.text.substring(0, 10000), // First 10K chars
      });
      
      console.log(`     ✅ Extracted: ${entities.concepts?.length || 0} concepts, ${entities.methods?.length || 0} methods`);
      stats.conceptsExtracted += entities.concepts?.length || 0;
      stats.methodsExtracted += entities.methods?.length || 0;
      stats.datasetsExtracted += entities.datasets?.length || 0;
      
      // Step 4: Map relationships
      console.log('  🔗 Step 4: Mapping relationships...');
      const relationships = await mapperAgent.execute({
        paperId: storedPaper.id,
        entities,
      });
      
      console.log(`     ✅ Mapped: ${relationships.improvements?.length || 0} improvements`);
      stats.relationshipsMapped += relationships.improvements?.length || 0;
      
      stats.papersProcessed++;
      console.log(`  ✅ Paper ${i + 1}/${PAPERS.length} complete!`);
      
    } catch (error: any) {
      console.error(`  ❌ Error processing paper: ${error.message}`);
      stats.errors++;
    }
  }
  
  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('🎉 BATCH PROCESSING COMPLETE!');
  console.log('='.repeat(70));
  console.log('FINAL STATISTICS:');
  console.log(`  Papers Processed:     ${stats.papersProcessed}/${PAPERS.length}`);
  console.log(`  Papers Skipped:       ${stats.papersSkipped}`);
  console.log(`  Concepts Extracted:   ${stats.conceptsExtracted}`);
  console.log(`  Methods Extracted:    ${stats.methodsExtracted}`);
  console.log(`  Datasets Extracted:   ${stats.datasetsExtracted}`);
  console.log(`  Relationships Mapped: ${stats.relationshipsMapped}`);
  console.log(`  Errors:               ${stats.errors}`);
  console.log('='.repeat(70));
  console.log('\n✅ Your knowledge graph is ready!');
  console.log('✅ Check your Supabase database to see all the extracted data!');
}

batchProcessPapers();