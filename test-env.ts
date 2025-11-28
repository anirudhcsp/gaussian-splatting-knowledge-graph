import dotenv from 'dotenv';

// Load .env
const result = dotenv.config();

console.log('=== DOTENV DEBUG ===');
console.log('dotenv.config() result:', result);
console.log('');
console.log('Environment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Present (length: ' + process.env.SUPABASE_KEY.length + ')' : 'MISSING');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Present (length: ' + process.env.SUPABASE_SERVICE_KEY.length + ')' : 'MISSING');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Present (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'MISSING');