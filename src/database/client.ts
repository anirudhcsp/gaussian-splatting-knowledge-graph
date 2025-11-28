import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../utils/config';
import { log } from '../utils/logger';

/**
 * Supabase client singleton
 */
let supabaseInstance: SupabaseClient | null = null;

/**
 * Initialize and return Supabase client
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const { url, key } = config.supabase;
    
    if (!url || !key) {
      throw new Error('Supabase configuration is missing. Please check your .env file.');
    }
    
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
      },
    });
    
    log.info('Supabase client initialized');
  }
  
  return supabaseInstance;
}

/**
 * Database client with typed methods
 */
export class DatabaseClient {
  private client: SupabaseClient;
  
  constructor() {
    this.client = getSupabaseClient();
  }
  
  /**
   * Get the underlying Supabase client
   */
  getClient(): SupabaseClient {
    return this.client;
  }
  
  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client.from('papers').select('id').limit(1);
      
      if (error) {
        log.error('Database connection test failed', error);
        return false;
      }
      
      log.info('Database connection successful');
      return true;
    } catch (error) {
      log.error('Database connection test failed', error);
      return false;
    }
  }
  
  /**
   * Execute a raw SQL query
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    try {
      const { data, error } = await this.client.rpc('exec_sql', {
        query: sql,
        params: params || [],
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      log.error('Query execution failed', error, { sql });
      throw error;
    }
  }
  
  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const [papers, concepts, methods, datasets, citations] = await Promise.all([
        this.client.from('papers').select('id', { count: 'exact', head: true }),
        this.client.from('concepts').select('id', { count: 'exact', head: true }),
        this.client.from('methods').select('id', { count: 'exact', head: true }),
        this.client.from('datasets').select('id', { count: 'exact', head: true }),
        this.client.from('paper_cites').select('id', { count: 'exact', head: true }),
      ]);
      
      return {
        papers: papers.count || 0,
        concepts: concepts.count || 0,
        methods: methods.count || 0,
        datasets: datasets.count || 0,
        citations: citations.count || 0,
      };
    } catch (error) {
      log.error('Failed to get database stats', error);
      return {
        papers: 0,
        concepts: 0,
        methods: 0,
        datasets: 0,
        citations: 0,
      };
    }
  }
}

/**
 * Default database client instance
 */
export const db = new DatabaseClient();

/**
 * Export Supabase client for direct access
 */
export const supabase = getSupabaseClient();