/**
 * Demo script showing how to use the Knowledge Graph system
 */

import { initialize } from '../src/index';
import { db } from '../src/database/client';
import { log } from '../src/utils/logger';

async function runDemo() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    DEMO MODE                                  ║
║   Quick demonstration of the Knowledge Graph system          ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  try {
    // Initialize system
    log.info('Initializing system...');
    const coordinator = await initialize();
    
    // Example 1: Process a single paper
    console.log('\n📄 Example 1: Process a single paper\n');
    log.info('This will fetch, parse, and extract entities from one paper');
    
    const paperId = '2308.04079'; // 3D Gaussian Splatting paper
    
    // Uncomment to run:
    // await coordinator.orchestratePaperProcessing(paperId);
    
    log.info('✅ (Skipped in demo - uncomment to run)');
    
    // Example 2: Show current database stats
    console.log('\n📊 Example 2: Database Statistics\n');
    const stats = await db.getStats();
    
    console.table({
      'Papers': stats.papers,
      'Concepts': stats.concepts,
      'Methods': stats.methods,
      'Datasets': stats.datasets,
      'Citations': stats.citations,
    });
    
    // Example 3: Query recent papers
    console.log('\n🔍 Example 3: Query Recent Papers\n');
    
    const client = db.getClient();
    const { data: recentPapers, error } = await client
      .from('papers')
      .select('title, published_date, arxiv_id')
      .order('published_date', { ascending: false })
      .limit(5);
    
    if (error) {
      log.error('Failed to fetch papers', error);
    } else if (recentPapers && recentPapers.length > 0) {
      console.log('Most recent papers in database:');
      recentPapers.forEach((paper, i) => {
        console.log(`${i + 1}. ${paper.title}`);
        console.log(`   arXiv: ${paper.arxiv_id || 'N/A'}`);
        console.log(`   Date: ${paper.published_date || 'N/A'}\n`);
      });
    } else {
      console.log('No papers in database yet. Run the full pipeline to populate data.');
    }
    
    // Example 4: Query concepts
    console.log('\n💡 Example 4: Top Concepts\n');
    
    const { data: concepts, error: conceptError } = await client
      .from('concepts')
      .select('name, category, confidence')
      .order('confidence', { ascending: false })
      .limit(5);
    
    if (conceptError) {
      log.error('Failed to fetch concepts', conceptError);
    } else if (concepts && concepts.length > 0) {
      console.log('Top concepts by confidence:');
      concepts.forEach((concept, i) => {
        console.log(`${i + 1}. ${concept.name} (${concept.category})`);
        console.log(`   Confidence: ${concept.confidence}\n`);
      });
    } else {
      console.log('No concepts in database yet.');
    }
    
    // Example 5: Agent coordinator stats
    console.log('\n🤖 Example 5: Agent System Status\n');
    const agentStats = coordinator.getStats();
    console.table(agentStats);
    
    // Example 6: Example query - Find improvements
    console.log('\n🔗 Example 6: Concept Improvements\n');
    
    const { data: improvements, error: impError } = await client
      .from('concept_improves_concept')
      .select(`
        improvement_type,
        confidence,
        new:concepts!concept_improves_concept_new_concept_fkey (name),
        old:concepts!concept_improves_concept_old_concept_fkey (name)
      `)
      .order('confidence', { ascending: false })
      .limit(5);
    
    if (impError) {
      log.error('Failed to fetch improvements', impError);
    } else if (improvements && improvements.length > 0) {
      console.log('Concept improvement relationships:');
      improvements.forEach((imp, i) => {
        console.log(`${i + 1}. ${imp.new.name}`);
        console.log(`   ${imp.improvement_type} → ${imp.old.name}`);
        console.log(`   Confidence: ${imp.confidence}\n`);
      });
    } else {
      console.log('No improvement relationships found yet.');
    }
    
    // Example 7: Papers with most citations
    console.log('\n📈 Example 7: Most Cited Papers\n');
    
    const { data: citedPapers, error: citeError } = await client
      .rpc('get_most_cited_papers', { limit_count: 5 })
      .catch(() => {
        // Fallback if stored procedure doesn't exist
        return client
          .from('papers_with_stats')
          .select('title, citation_count')
          .order('citation_count', { ascending: false })
          .limit(5);
      });
    
    if (citeError) {
      log.error('Failed to fetch cited papers', citeError);
    } else if (citedPapers && citedPapers.length > 0) {
      console.log('Most cited papers:');
      citedPapers.forEach((paper, i) => {
        console.log(`${i + 1}. ${paper.title}`);
        console.log(`   Citations: ${paper.citation_count || 0}\n`);
      });
    } else {
      console.log('Citation data not available yet.');
    }
    
    console.log('\n✨ Demo complete!');
    console.log('\n📚 Next steps:');
    console.log('1. Run `npm run dev` to execute the full pipeline');
    console.log('2. Explore the database in Supabase dashboard');
    console.log('3. Run custom queries using the database client');
    console.log('4. Check the logs in logs/combined.log\n');
    
  } catch (error) {
    log.error('Demo failed', error);
    process.exit(1);
  }
}

// Run demo
runDemo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});