// Test script to verify backend API connection
const API_URL = 'https://hostel-ledger-backend.vercel.app';

async function testBackendConnection() {
  console.log('🔍 Testing backend API connection...');
  console.log('📍 API URL:', API_URL);
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_URL}/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok) {
      console.log('✅ Health check passed:', healthData.message);
      console.log('⏰ Timestamp:', healthData.timestamp);
    } else {
      console.log('❌ Health check failed:', healthResponse.status, healthData);
      return;
    }
    
    // Test root endpoint
    console.log('\n2. Testing root endpoint...');
    const rootResponse = await fetch(`${API_URL}/`);
    const rootData = await rootResponse.json();
    
    if (rootResponse.ok) {
      console.log('✅ Root endpoint working:', rootData.message);
      console.log('📋 Available endpoints:', rootData.endpoints);
    } else {
      console.log('❌ Root endpoint failed:', rootResponse.status, rootData);
    }
    
    // Test verification email endpoint (with test data)
    console.log('\n3. Testing verification email endpoint...');
    const emailResponse = await fetch(`${API_URL}/api/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        code: '123456',
        name: 'Test User'
      })
    });
    
    const emailData = await emailResponse.json();
    
    if (emailResponse.ok) {
      console.log('✅ Verification email endpoint working');
      console.log('📧 Message ID:', emailData.messageId);
    } else {
      console.log('❌ Verification email endpoint failed:', emailResponse.status, emailData);
      
      // Check if it's a rate limiting issue
      if (emailResponse.status === 429) {
        console.log('⚠️  Rate limiting detected - this is expected during testing');
      }
    }
    
    console.log('\n🎉 Backend API test completed!');
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('💡 This might be a CORS or network connectivity issue');
    }
  }
}

// Run the test
testBackendConnection();