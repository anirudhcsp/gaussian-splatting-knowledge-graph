import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import { db } from './src/database/client';
import { config } from './src/utils/config';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  console.log('URL:', config.supabase.url);
  console.log('Key:', config.supabase.key ? '✓ Present' : '✗ Missing');
  
  try {
    // Test query - check if papers table exists
    const { data, error } = await db.getClient()
      .from('papers')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful!');
    console.log('📊 Papers table is accessible');
    return true;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});