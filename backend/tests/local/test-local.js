// Quick test to see what's causing the 500 error
const { handler } = require('./netlify/functions/request-password-reset.js');

async function testLocal() {
  console.log('🧪 Testing password reset function...');
  
  const mockEvent = {
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      'origin': 'http://localhost:5000'
    },
    body: JSON.stringify({ email: 'test@example.com' })
  };

  try {
    const result = await handler(mockEvent);
    console.log('✅ Status:', result.statusCode);
    console.log('📄 Body:', result.body);
    
    if (result.statusCode !== 200) {
      console.log('❌ Function returned error status');
    }
  } catch (error) {
    console.error('❌ Function threw error:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

testLocal();
