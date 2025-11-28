/**
 * Text normalization and utility functions
 */

/**
 * Normalize entity names for deduplication
 * Example: "3D Gaussian Splatting" -> "3d-gaussian-splatting"
 */
export function normalizeEntityName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  /**
   * Calculate similarity between two strings (Levenshtein distance)
   */
  export function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    const matrix: number[][] = [];
    
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const maxLen = Math.max(s1.length, s2.length);
    return 1 - matrix[s1.length][s2.length] / maxLen;
  }
  
  /**
   * Check if two entity names are similar enough to be considered duplicates
   */
  export function areSimilarEntities(name1: string, name2: string, threshold: number = 0.85): boolean {
    const similarity = calculateSimilarity(name1, name2);
    return similarity >= threshold;
  }
  
  /**
   * Extract year from date string or Date object
   */
  export function extractYear(date: Date | string | undefined): number | null {
    if (!date) return null;
    
    if (typeof date === 'string') {
      const match = date.match(/\d{4}/);
      return match ? parseInt(match[0]) : null;
    }
    
    return date.getFullYear();
  }
  
  /**
   * Truncate text to a maximum length
   */
  export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }
  
  /**
   * Clean and format abstract text
   */
  export function cleanAbstract(abstract: string): string {
    return abstract
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
  }
  
  /**
   * Extract arXiv ID from various formats
   * Examples: "2308.04079", "arXiv:2308.04079", "https://arxiv.org/abs/2308.04079"
   */
  export function extractArxivId(input: string): string | null {
    const patterns = [
      /(\d{4}\.\d{4,5})/,  // Direct ID
      /arxiv:(\d{4}\.\d{4,5})/i,  // arXiv:ID
      /arxiv\.org\/abs\/(\d{4}\.\d{4,5})/i,  // URL
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }
  
  /**
   * Chunk large text into smaller pieces for LLM processing
   */
  export function chunkText(text: string, maxChunkSize: number = 4000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + maxChunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - overlap;
    }
    
    return chunks;
  }
  
  /**
   * Sleep for a specified duration (useful for rate limiting)
   */
  export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Retry a function with exponential backoff
   */
  export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
    
    throw new Error('Retry failed');
  }