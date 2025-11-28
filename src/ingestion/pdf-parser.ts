import * as fs from 'fs';
import pdf from 'pdf-parse';
import { log } from '../utils/logger';

/**
 * PDF Parser for extracting text and structure from academic papers
 */
export class PDFParser {
  /**
   * Parse PDF file and extract text
   */
  async parsePDF(filePath: string): Promise<{
    text: string;
    numPages: number;
    metadata?: any;
  }> {
    try {
      log.info(`Parsing PDF: ${filePath}`);
      
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      
      log.debug('PDF parsed successfully', {
        pages: data.numpages,
        textLength: data.text.length,
      });
      
      return {
        text: data.text,
        numPages: data.numpages,
        metadata: data.info,
      };
      
    } catch (error) {
      log.error(`Failed to parse PDF: ${filePath}`, error);
      throw error;
    }
  }
  
  /**
   * Extract sections from paper text
   * 
   * Common sections: Abstract, Introduction, Related Work, Method, Results, Conclusion
   */
  extractSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};
    
    // Common section headers (case-insensitive)
    const sectionPatterns = [
      { name: 'abstract', pattern: /abstract[\s\n:]+/i },
      { name: 'introduction', pattern: /introduction[\s\n:]+/i },
      { name: 'related_work', pattern: /related\s+work[\s\n:]+/i },
      { name: 'background', pattern: /background[\s\n:]+/i },
      { name: 'method', pattern: /method[\s\n:]+/i },
      { name: 'approach', pattern: /approach[\s\n:]+/i },
      { name: 'results', pattern: /results[\s\n:]+/i },
      { name: 'experiments', pattern: /experiments[\s\n:]+/i },
      { name: 'evaluation', pattern: /evaluation[\s\n:]+/i },
      { name: 'discussion', pattern: /discussion[\s\n:]+/i },
      { name: 'conclusion', pattern: /conclusion[\s\n:]+/i },
      { name: 'references', pattern: /references[\s\n:]+/i },
    ];
    
    // Try to find section boundaries
    let lastIndex = 0;
    let lastSectionName = 'content';
    
    for (const { name, pattern } of sectionPatterns) {
      const match = text.match(pattern);
      if (match && match.index !== undefined) {
        // Save previous section
        if (lastIndex < match.index) {
          sections[lastSectionName] = text.slice(lastIndex, match.index).trim();
        }
        
        lastIndex = match.index;
        lastSectionName = name;
      }
    }
    
    // Save the last section
    if (lastIndex < text.length) {
      sections[lastSectionName] = text.slice(lastIndex).trim();
    }
    
    // If no sections found, return full text as "content"
    if (Object.keys(sections).length === 0) {
      sections['content'] = text;
    }
    
    return sections;
  }
  
  /**
   * Extract references from paper text
   */
  extractReferences(text: string): string[] {
    const references: string[] = [];
    
    // Look for References section
    const refMatch = text.match(/references[\s\n:]+(.+)/is);
    
    if (refMatch) {
      const refSection = refMatch[1];
      
      // Split by common reference patterns
      // References typically start with [1], [2] or numbered lines
      const lines = refSection.split('\n');
      
      let currentRef = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check if line starts with a reference number
        if (/^\[\d+\]/.test(trimmedLine) || /^\d+\./.test(trimmedLine)) {
          // Save previous reference
          if (currentRef.length > 20) {
            references.push(currentRef.trim());
          }
          // Start new reference
          currentRef = trimmedLine;
        } else if (trimmedLine.length > 0) {
          // Continue current reference
          currentRef += ' ' + trimmedLine;
        }
      }
      
      // Save last reference
      if (currentRef.length > 20) {
        references.push(currentRef.trim());
      }
    }
    
    return references;
  }
  
  /**
   * Extract title and abstract from beginning of text
   */
  extractTitleAndAbstract(text: string): {
    title?: string;
    abstract?: string;
  } {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Title is usually the first substantial line
    const title = lines[0]?.trim();
    
    // Look for abstract
    const abstractMatch = text.match(/abstract[\s\n:]+(.+?)(?=\n\n|\nintroduction)/is);
    const abstract = abstractMatch ? abstractMatch[1].trim() : undefined;
    
    return { title, abstract };
  }
  
  /**
   * Extract author names (best effort)
   */
  extractAuthors(text: string): string[] {
    const authors: string[] = [];
    
    // Look for common author patterns in the first few lines
    const firstPart = text.slice(0, 2000);
    
    // Pattern: Name1, Name2, and Name3
    const authorPattern = /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:,|\s+and\s+)/g;
    const matches = firstPart.matchAll(authorPattern);
    
    for (const match of matches) {
      if (match[1]) {
        authors.push(match[1].trim());
      }
    }
    
    return authors;
  }
  
  /**
   * Extract key metrics mentioned in the paper
   */
  extractMetrics(text: string): Array<{ name: string; value?: string }> {
    const metrics: Array<{ name: string; value?: string }> = [];
    
    // Common metrics in computer graphics papers
    const metricPatterns = [
      { name: 'PSNR', pattern: /PSNR[:\s]+(\d+\.?\d*)\s*dB?/gi },
      { name: 'SSIM', pattern: /SSIM[:\s]+(\d+\.?\d*)/gi },
      { name: 'FPS', pattern: /(\d+\.?\d*)\s*FPS/gi },
      { name: 'rendering time', pattern: /rendering time[:\s]+(\d+\.?\d*)\s*(ms|seconds?)/gi },
      { name: 'memory usage', pattern: /memory[:\s]+(\d+\.?\d*)\s*(MB|GB)/gi },
    ];
    
    for (const { name, pattern } of metricPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        metrics.push({
          name,
          value: match[1],
        });
      }
    }
    
    return metrics;
  }
  
  /**
   * Full paper analysis (extracts everything)
   */
  async analyzePaper(filePath: string): Promise<{
    text: string;
    numPages: number;
    title?: string;
    abstract?: string;
    authors: string[];
    sections: Record<string, string>;
    references: string[];
    metrics: Array<{ name: string; value?: string }>;
  }> {
    const { text, numPages, metadata } = await this.parsePDF(filePath);
    
    const { title, abstract } = this.extractTitleAndAbstract(text);
    const authors = this.extractAuthors(text);
    const sections = this.extractSections(text);
    const references = this.extractReferences(text);
    const metrics = this.extractMetrics(text);
    
    return {
      text,
      numPages,
      title,
      abstract,
      authors,
      sections,
      references,
      metrics,
    };
  }
}

/**
 * Default parser instance
 */
export const pdfParser = new PDFParser();