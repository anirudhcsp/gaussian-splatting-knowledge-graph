import dotenv from 'dotenv';
dotenv.config();

import { llmClient } from './src/llm/client';

async function testLLM() {
  console.log('🤖 Testing LLM Client...\n');
  
  try {
    const prompt = 'Say "Hello, I am working!" in exactly those words.';
    
    console.log('Sending test prompt to LLM...');
    const response = await llmClient.complete(prompt, {
      max_tokens: 50,
      temperature: 0,
    });
    
    console.log('✅ LLM Response:', response);
    console.log('\n✅ LLM client is working!');
    
  } catch (error: any) {
    console.error('❌ LLM test failed:', error.message);
    process.exit(1);
  }
}

testLLM();