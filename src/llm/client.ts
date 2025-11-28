import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../utils/config';
import { log } from '../utils/logger';
import { LLMConfig, LLMResponse } from '../types';
import { retryWithBackoff } from '../utils/helpers';

/**
 * Unified LLM client supporting both OpenAI and Anthropic
 */
export class LLMClient {
  private openai: OpenAI | null = null;
  private anthropic: any = null;
  
  constructor() {
    // Initialize OpenAI if key is available
    if (config.llm.openai_api_key) {
      this.openai = new OpenAI({
        apiKey: config.llm.openai_api_key,
      });
      log.info('OpenAI client initialized');
    }
    
    // Initialize Anthropic if key is available
    if (config.llm.anthropic_api_key) {
      this.anthropic = new Anthropic({
        apiKey: config.llm.anthropic_api_key,
      });
      log.info('Anthropic client initialized');
    }
    
    if (!this.openai && !this.anthropic) {
      throw new Error('No LLM API keys configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
    }
  }
  
  /**
   * Complete a prompt using the configured LLM
   */
  async complete(
    prompt: string,
    options: Partial<LLMConfig> = {}
  ): Promise<string> {
    const llmConfig: LLMConfig = {
      provider: options.provider || config.llm.default_provider,
      model: options.model || config.llm.default_model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens ?? 4096,
      response_format: options.response_format,
    };
    
    // Use retry logic for API calls
    return retryWithBackoff(async () => {
      if (llmConfig.provider === 'openai') {
        return await this.completeWithOpenAI(prompt, llmConfig);
      } else {
        return await this.completeWithAnthropic(prompt, llmConfig);
      }
    }, 3, 1000);
  }
  
  /**
   * Complete using OpenAI
   */
  private async completeWithOpenAI(
    prompt: string,
    config: LLMConfig
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    try {
      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert research assistant specializing in computer graphics, 3D reconstruction, and academic paper analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        response_format: config.response_format,
      });
      
      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }
      
      log.debug('OpenAI completion successful', {
        model: config.model,
        tokens: response.usage?.total_tokens,
      });
      
      return content;
      
    } catch (error) {
      log.error('OpenAI completion failed', error);
      throw error;
    }
  }
  
  /**
   * Complete using Anthropic Claude
   */
  private async completeWithAnthropic(
    prompt: string,
    config: LLMConfig
  ): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }
    
    try {
      const response = await this.anthropic.messages.create({
        model: config.model,
        max_tokens: config.max_tokens!,
        temperature: config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
      
      const content = response.content[0];
      
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Anthropic');
      }
      
      log.debug('Anthropic completion successful', {
        model: config.model,
        tokens: response.usage.input_tokens + response.usage.output_tokens,
      });
      
      return content.text;
      
    } catch (error) {
      log.error('Anthropic completion failed', error);
      throw error;
    }
  }
  
  /**
   * Extract structured JSON from LLM response
   */
  async extractStructuredData<T = any>(
    prompt: string,
    options: Partial<LLMConfig> = {}
  ): Promise<T> {
    const response = await this.complete(prompt, {
      ...options,
      response_format: { type: 'json_object' },
    });
    
    try {
      return JSON.parse(response) as T;
    } catch (error) {
      log.error('Failed to parse LLM JSON response', error, { response });
      throw new Error('Invalid JSON response from LLM');
    }
  }
}

/**
 * Default LLM client instance
 */
export const llmClient = new LLMClient();