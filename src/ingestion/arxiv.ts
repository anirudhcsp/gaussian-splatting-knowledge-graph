import axios from 'axios';
import { log } from '../utils/logger';
import { extractArxivId } from '../utils/helpers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * arXiv API client
 * 
 * Documentation: https://arxiv.org/help/api
 */
export class ArxivClient {
  private baseUrl = 'http://export.arxiv.org/api/query';
  private pdfBaseUrl = 'https://arxiv.org/pdf';
  
  /**
   * Get paper metadata by arXiv ID
   */
  async getPaper(arxivId: string): Promise<any> {
    const cleanId = extractArxivId(arxivId);
    
    if (!cleanId) {
      throw new Error(`Invalid arXiv ID: ${arxivId}`);
    }
    
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          id_list: cleanId,
        },
      });
      
      // TODO: Parse XML response
      // For now, return basic structure
      log.debug('Fetched arXiv paper metadata', { arxivId: cleanId });
      
      return {
        id: cleanId,
        pdf_url: `${this.pdfBaseUrl}/${cleanId}.pdf`,
      };
      
    } catch (error) {
      log.error(`Failed to fetch arXiv paper ${arxivId}`, error);
      throw error;
    }
  }
  
  /**
   * Download PDF from arXiv
   */
  async downloadPDF(arxivId: string, outputDir: string = '/tmp'): Promise<string> {
    const cleanId = extractArxivId(arxivId);
    
    if (!cleanId) {
      throw new Error(`Invalid arXiv ID: ${arxivId}`);
    }
    
    const url = `${this.pdfBaseUrl}/${cleanId}.pdf`;
    const outputPath = path.join(outputDir, `${cleanId}.pdf`);
    
    try {
      log.info(`Downloading PDF: ${url}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeGraphBot/1.0)',
        },
      });
      
      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, response.data);
      log.info(`PDF saved: ${outputPath}`);
      
      return outputPath;
      
    } catch (error) {
      log.error(`Failed to download PDF ${arxivId}`, error);
      throw error;
    }
  }
  
  /**
   * Check if PDF exists locally
   */
  checkPDFExists(arxivId: string, outputDir: string = '/tmp'): boolean {
    const cleanId = extractArxivId(arxivId);
    if (!cleanId) return false;
    
    const pdfPath = path.join(outputDir, `${cleanId}.pdf`);
    return fs.existsSync(pdfPath);
  }
  
  /**
   * Get local PDF path
   */
  getPDFPath(arxivId: string, outputDir: string = '/tmp'): string {
    const cleanId = extractArxivId(arxivId);
    if (!cleanId) {
      throw new Error(`Invalid arXiv ID: ${arxivId}`);
    }
    
    return path.join(outputDir, `${cleanId}.pdf`);
  }
  
  /**
   * Download PDF only if not already cached
   */
  async downloadPDFIfNeeded(arxivId: string, outputDir: string = '/tmp'): Promise<string> {
    if (this.checkPDFExists(arxivId, outputDir)) {
      const pdfPath = this.getPDFPath(arxivId, outputDir);
      log.debug(`PDF already exists: ${pdfPath}`);
      return pdfPath;
    }
    
    return await this.downloadPDF(arxivId, outputDir);
  }
  
  /**
   * Search arXiv by query
   */
  async search(query: string, maxResults: number = 10): Promise<any[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          search_query: query,
          max_results: maxResults,
        },
      });
      
      // TODO: Parse XML response and extract paper data
      log.debug('arXiv search completed', { query, maxResults });
      
      return [];
      
    } catch (error) {
      log.error('arXiv search failed', error);
      return [];
    }
  }
  
  /**
   * Get PDF URL for an arXiv ID
   */
  getPDFUrl(arxivId: string): string {
    const cleanId = extractArxivId(arxivId);
    if (!cleanId) {
      throw new Error(`Invalid arXiv ID: ${arxivId}`);
    }
    
    return `${this.pdfBaseUrl}/${cleanId}.pdf`;
  }
  
  /**
   * Batch download PDFs
   */
  async batchDownloadPDFs(
    arxivIds: string[],
    outputDir: string = '/tmp',
    skipExisting: boolean = true
  ): Promise<string[]> {
    const downloadedPaths: string[] = [];
    
    for (const arxivId of arxivIds) {
      try {
        let pdfPath: string;
        
        if (skipExisting) {
          pdfPath = await this.downloadPDFIfNeeded(arxivId, outputDir);
        } else {
          pdfPath = await this.downloadPDF(arxivId, outputDir);
        }
        
        downloadedPaths.push(pdfPath);
        
        // Small delay between downloads to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        log.warn(`Failed to download PDF in batch: ${arxivId}`);
      }
    }
    
    log.info(`Batch download complete: ${downloadedPaths.length}/${arxivIds.length} PDFs`);
    return downloadedPaths;
  }
}

/**
 * Default client instance
 */
export const arxiv = new ArxivClient();