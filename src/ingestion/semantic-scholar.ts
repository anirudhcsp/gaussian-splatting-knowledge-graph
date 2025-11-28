import axios from 'axios';
import { SemanticScholarPaper } from '../types';
import { log } from '../utils/logger';
import { sleep } from '../utils/helpers';

/**
 * Semantic Scholar API client
 * 
 * Documentation: https://api.semanticscholar.org/
 * Rate limit: 100 requests per 5 minutes (no key required)
 */
export class SemanticScholarClient {
  private baseUrl = 'https://api.semanticscholar.org/graph/v1';
  private apiKey?: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }
  
  /**
   * Get paper by arXiv ID or Semantic Scholar ID
   */
  async getPaper(paperId: string, fields?: string[]): Promise<SemanticScholarPaper | null> {
    const defaultFields = [
      'paperId',
      'externalIds',
      'title',
      'abstract',
      'year',
      'authors',
      'citationCount',
      'referenceCount',
      'publicationDate',
      'openAccessPdf',
    ];
    
    const fieldStr = (fields || defaultFields).join(',');
    
    try {
      await this.waitForRateLimit();
      
      const response = await axios.get(`${this.baseUrl}/paper/${paperId}`, {
        params: { fields: fieldStr },
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
      });
      
      log.debug('Fetched paper from Semantic Scholar', { paperId });
      return response.data;
      
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        log.warn(`Paper not found: ${paperId}`);
        return null;
      }
      
      log.error(`Failed to fetch paper ${paperId}`, error);
      throw error;
    }
  }
  
  /**
   * Get paper references (papers cited by this paper)
   */
  async getReferences(paperId: string, limit: number = 100): Promise<SemanticScholarPaper[]> {
    try {
      await this.waitForRateLimit();
      
      const response = await axios.get(`${this.baseUrl}/paper/${paperId}/references`, {
        params: {
          fields: 'paperId,title,year,citationCount,externalIds',
          limit,
        },
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
      });
      
      const references = response.data.data.map((item: any) => item.citedPaper);
      log.debug('Fetched references', { paperId, count: references.length });
      
      return references;
      
    } catch (error) {
      log.error(`Failed to fetch references for ${paperId}`, error);
      return [];
    }
  }
  
  /**
   * Get paper citations (papers that cite this paper)
   */
  async getCitations(paperId: string, limit: number = 100): Promise<SemanticScholarPaper[]> {
    try {
      await this.waitForRateLimit();
      
      const response = await axios.get(`${this.baseUrl}/paper/${paperId}/citations`, {
        params: {
          fields: 'paperId,title,year,citationCount,externalIds',
          limit,
        },
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
      });
      
      const citations = response.data.data.map((item: any) => item.citingPaper);
      log.debug('Fetched citations', { paperId, count: citations.length });
      
      return citations;
      
    } catch (error) {
      log.error(`Failed to fetch citations for ${paperId}`, error);
      return [];
    }
  }
  
  /**
   * Search papers by query
   */
  async searchPapers(query: string, limit: number = 10): Promise<SemanticScholarPaper[]> {
    try {
      await this.waitForRateLimit();
      
      const response = await axios.get(`${this.baseUrl}/paper/search`, {
        params: {
          query,
          fields: 'paperId,title,year,abstract,citationCount,externalIds',
          limit,
        },
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
      });
      
      log.debug('Search completed', { query, results: response.data.data.length });
      return response.data.data;
      
    } catch (error) {
      log.error('Search failed', error);
      return [];
    }
  }
  
  /**
   * Get paper by arXiv ID (convenience method)
   */
  async getPaperByArxivId(arxivId: string): Promise<SemanticScholarPaper | null> {
    // Clean arXiv ID (remove prefix if present)
    const cleanId = arxivId.replace('arXiv:', '').replace('arxiv:', '');
    return this.getPaper(`arXiv:${cleanId}`);
  }
  
  /**
   * Batch get papers (with rate limiting)
   */
  async batchGetPapers(paperIds: string[]): Promise<SemanticScholarPaper[]> {
    const papers: SemanticScholarPaper[] = [];
    
    for (const paperId of paperIds) {
      try {
        const paper = await this.getPaper(paperId);
        if (paper) {
          papers.push(paper);
        }
      } catch (error) {
        log.warn(`Failed to fetch paper in batch: ${paperId}`);
      }
    }
    
    return papers;
  }
  
  /**
   * Respect rate limits (100 requests per 5 minutes)
   * Without API key: ~600ms between requests = 100 req/min
   * With API key: rate limits are higher
   */
  async waitForRateLimit(): Promise<void> {
    const delay = this.apiKey ? 100 : 600;
    await sleep(delay);
  }
}

/**
 * Default client instance
 */
export const semanticScholar = new SemanticScholarClient();