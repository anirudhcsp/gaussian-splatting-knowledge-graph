import dotenv from 'dotenv';

// Load environment variables FIRST (before any other imports)
dotenv.config();

import { SystemConfig } from '../types';

// Load environment variables
dotenv.config();

/**
 * System configuration loaded from environment variables
 */
export const config: SystemConfig = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  llm: {
    openai_api_key: process.env.OPENAI_API_KEY || '',
    anthropic_api_key: process.env.ANTHROPIC_API_KEY || '',
    default_provider: (process.env.DEFAULT_LLM_PROVIDER as 'openai' | 'anthropic') || 'openai',
    default_model: process.env.DEFAULT_MODEL || 'gpt-4-turbo-preview',
  },
  agent: {
    max_papers_to_process: parseInt(process.env.MAX_PAPERS_TO_PROCESS || '50'),
    max_concurrent_agents: parseInt(process.env.MAX_CONCURRENT_AGENTS || '3'),
    retry_attempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    timeout_ms: parseInt(process.env.TIMEOUT_MS || '300000'),
  },
  logging: {
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  },
};

/**
 * Validate that all required configuration is present
 */
export function validateConfig(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'OPENAI_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy .env.example to .env and fill in the values.'
    );
  }

  console.log('✅ Configuration validated successfully');
}

/**
 * Get configuration value safely
 */
export function getConfig<K extends keyof SystemConfig>(key: K): SystemConfig[K] {
  return config[key];
}
