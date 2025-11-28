import dotenv from 'dotenv';
dotenv.config();

import { db } from './src/database/client';

async function demo() {
  console.log('\n' + '='.repeat(80));
  console.log('  🚀 GAUSSIAN SPLATTING KNOWLEDGE GRAPH - DEMO');
  console.log('  Alaris Security AI Engineer Take-Home Assignment');
  console.log('='.repeat(80));
  console.log('');
  
  try {
    // Query 1: Show all papers
    console.log('📚 PAPERS IN KNOWLEDGE GRAPH:');
    console.log('-'.repeat(80));
    const { data: papers } = await db.getClient()
      .from('papers')
      .select('id, title, arxiv_id')
      .order('created_at', { ascending: true });
    
    papers?.forEach((paper, index) => {
      console.log(`${index + 1}. ${paper.title}`);
      console.log(`   arXiv: ${paper.arxiv_id}`);
    });
    
    console.log('');
    
    // Query 2: Show all concepts
    console.log('💡 EXTRACTED CONCEPTS:');
    console.log('-'.repeat(80));
    const { data: concepts } = await db.getClient()
      .from('concepts')
      .select('name, confidence')
      .order('confidence', { ascending: false });
    
    concepts?.forEach((concept, index) => {
      console.log(`${index + 1}. ${concept.name} (confidence: ${concept.confidence})`);
    });
    
    console.log('');
    
    // Query 3: Show concept relationships
    console.log('🔗 CONCEPT RELATIONSHIPS:');
    console.log('-'.repeat(80));
    const { data: relationships } = await db.getClient()
      .from('concept_improves_concept')
      .select(`
        improvement_type,
        confidence,
        new_concept:concepts!concept_improves_concept_new_concept_fkey(name),
        old_concept:concepts!concept_improves_concept_old_concept_fkey(name)
      `);
    
    if (relationships && relationships.length > 0) {
      relationships.forEach((rel: any, index) => {
        console.log(`${index + 1}. "${rel.new_concept.name}" IMPROVES "${rel.old_concept.name}"`);
        console.log(`   Type: ${rel.improvement_type}, Confidence: ${rel.confidence}`);
      });
    } else {
      console.log('No relationships found yet. Process more papers to build the graph!');
    }
    
    console.log('');
    
    // Query 4: Show paper-concept links
    console.log('📊 PAPER-CONCEPT LINKS:');
    console.log('-'.repeat(80));
    const { data: paperConcepts } = await db.getClient()
      .from('paper_introduces_concept')
      .select(`
        papers(title),
        concepts(name)
      `)
      .limit(10);
    
    paperConcepts?.forEach((link: any, index) => {
      console.log(`${index + 1}. "${link.papers.title}" introduces "${link.concepts.name}"`);
    });
    
    console.log('');
    console.log('='.repeat(80));
    console.log('  ✅ DEMO COMPLETE');
    console.log('  📊 Total Papers: ' + (papers?.length || 0));
    console.log('  💡 Total Concepts: ' + (concepts?.length || 0));
    console.log('  🔗 Total Relationships: ' + (relationships?.length || 0));
    console.log('='.repeat(80));
    console.log('');
    
  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

demo();