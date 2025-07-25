// test-api.js
import { healthCheck } from './lib/api.js';

async function testAPI() {
  console.log('Testing API connection...');
  
  const result = await healthCheck();
  
  if (result.success) {
    console.log('✅ API Connection successful!');
    console.log('Backend response:', result.data);
  } else {
    console.log('❌ API Connection failed!');
    console.log('Error:', result.error);
  }
}

testAPI();