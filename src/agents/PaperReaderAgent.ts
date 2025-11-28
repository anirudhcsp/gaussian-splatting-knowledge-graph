import { Agent } from './base/Agent';
import { Paper } from '../types';
import { semanticScholar } from '../ingestion/semantic-scholar';
import { arxiv } from '../ingestion/arxiv';
import { pdfParser } from '../ingestion/pdf-parser';
import { insertPaper, getPaperByArxivId, getPaperBySemanticScholarId, updatePaperText } from '../database/queries';
import { extractArxivId } from '../utils/helpers';

/**
 * PaperReaderAgent
 * 
 * Responsibilities:
 * 1. Fetch related papers using Semantic Scholar API (BFS traversal)
 * 2. Download PDFs from arXiv
 * 3. Parse PDF content
 * 4. Store papers in database
 */
export class PaperReaderAgent extends Agent {
  constructor() {
    super('PaperReaderAgent', 'reader');
  }
  
  /**
   * Main execution method
   * 
   * Input can be either:
   * - { seedPaper: string, limit: number } - Fetch multiple papers via BFS
   * - { paperId: string } - Parse a single paper
   */
  async execute(input: any): Promise<any> {
    this.log('Starting paper reading task');
    
    if (input.seedPaper) {
      // Fetch multiple papers via BFS traversal
      return await this.fetchRelatedPapers(input.seedPaper, input.limit || 50);
    } else if (input.paperId) {
      // Parse a single paper
      return await this.parsePaper(input.paperId);
    } else {
      throw new Error('Invalid input: must provide either seedPaper or paperId');
    }
  }
  
  /**
   * Fetch related papers using BFS traversal of citation network
   * 
   * Algorithm:
   * 1. Start with seed paper
   * 2. Fetch its references and citations via Semantic Scholar
   * 3. Add top N papers to queue
   * 4. Continue until limit reached
   */
  private async fetchRelatedPapers(seedPaper: string, limit: number): Promise<Paper[]> {
    this.log(`Fetching up to ${limit} papers related to ${seedPaper}`);
    
    const papers: Paper[] = [];
    const visited = new Set<string>();
    const queue: string[] = [seedPaper];
    
    try {
      while (papers.length < limit && queue.length > 0) {
        const currentPaperId = queue.shift()!;
        
        // Skip if already visited
        if (visited.has(currentPaperId)) continue;
        visited.add(currentPaperId);
        
        // Fetch paper from Semantic Scholar
        const paperData = await semanticScholar.getPaper(currentPaperId);
        
        if (!paperData) {
          this.log(`Paper not found: ${currentPaperId}`, 'warn');
          continue;
        }
        
        // Store paper in database
        const storedPaper = await this.storePaper(paperData);
        if (storedPaper) {
          papers.push(storedPaper);
          this.log(`Stored paper ${papers.length}/${limit}: ${paperData.title}`);
        }
        
        // Fetch references and citations to expand the graph
        if (papers.length < limit) {
          const references = await semanticScholar.getReferences(currentPaperId, 10);
          const citations = await semanticScholar.getCitations(currentPaperId, 10);
          
          // Add top papers to queue (prioritize by citation count)
          const relatedPapers = [...references, ...citations]
            .filter(p => p.paperId && !visited.has(p.paperId))
            .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
            .slice(0, 5)
            .map(p => p.paperId);
          
          queue.push(...relatedPapers);
          
          this.log(`Queue size: ${queue.length}, Visited: ${visited.size}`);
        }
      }
      
      this.log(`✅ Fetched ${papers.length} papers`);
      return papers;
      
    } catch (error) {
      this.logError('Failed to fetch related papers', error);
      throw error;
    }
  }
  
  /**
   * Parse a single paper
   * 
   * Steps:
   * 1. Download PDF from arXiv (if available)
   * 2. Extract text using pdf-parse
   * 3. Parse title, abstract, sections, references
   * 4. Update database with full text
   */
  private async parsePaper(paperId: string): Promise<any> {
    this.log(`Parsing paper: ${paperId}`);
    
    try {
      // Get paper from database
      const paper = await getPaperByArxivId(paperId) || await getPaperBySemanticScholarId(paperId);
      
      if (!paper) {
        throw new Error(`Paper not found in database: ${paperId}`);
      }
      
      // Download and parse PDF if arXiv ID is available
      if (paper.arxiv_id) {
        try {
          const pdfPath = await arxiv.downloadPDFIfNeeded(paper.arxiv_id);
          const analysis = await pdfParser.analyzePaper(pdfPath);
          
          // Update paper with full text
          await updatePaperText(paper.id, analysis.text);
          
          this.log(`✅ Parsed PDF for ${paper.title}`);
          
          return {
            id: paper.id,
            title: paper.title,
            abstract: paper.abstract,
            pdf_text: analysis.text,
            sections: analysis.sections,
            references: analysis.references,
          };
          
        } catch (error) {
          this.logError(`Failed to parse PDF for ${paper.arxiv_id}`, error);
        }
      }
      
      // Return paper data even if PDF parsing failed
      return {
        id: paper.id,
        title: paper.title,
        abstract: paper.abstract,
      };
      
    } catch (error) {
      this.logError('Failed to parse paper', error);
      throw error;
    }
  }
  
  /**
   * Store paper in database
   */
  private async storePaper(paperData: any): Promise<Paper | null> {
    try {
      // Check if paper already exists
      const arxivId = paperData.externalIds?.ArXiv;
      const ssId = paperData.paperId;
      
      if (arxivId) {
        const existing = await getPaperByArxivId(arxivId);
        if (existing) {
          this.log(`Paper already exists: ${arxivId}`, 'debug');
          return existing;
        }
      }
      
      if (ssId) {
        const existing = await getPaperBySemanticScholarId(ssId);
        if (existing) {
          this.log(`Paper already exists: ${ssId}`, 'debug');
          return existing;
        }
      }
      
      // Prepare paper data
      const paper = {
        title: paperData.title,
        arxiv_id: arxivId,
        semantic_scholar_id: ssId,
        abstract: paperData.abstract,
        published_date: paperData.publicationDate ? new Date(paperData.publicationDate) : undefined,
        pdf_url: paperData.openAccessPdf?.url || (arxivId ? arxiv.getPDFUrl(arxivId) : undefined),
        authors_json: paperData.authors || [],
      };
      
      // Insert into database
      const inserted = await insertPaper(paper);
      this.log(`Inserted paper: ${inserted.title}`);
      
      return inserted;
      
    } catch (error) {
      this.logError('Failed to store paper', error);
      return null;
    }
  }
}