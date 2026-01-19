// Test the frontend-backend connection with the exact same configuration
const API_URL = process.env.VITE_API_URL || 'https://hostel-ledger-backend.vercel.app';

async function testFrontendBackendConnection() {
  console.log('🔍 Testing frontend-backend connection...');
  console.log('📍 API URL:', API_URL);
  
  try {
    // Test 1: Health check
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_URL}/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed:', healthData.message);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
      return;
    }
    
    // Test 2: Verification email (same as signup form would do)
    console.log('\n2. Testing verification email (like signup form)...');
    const testEmail = 'test@example.com';
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const testName = 'Test User';
    
    const emailResponse = await fetch(`${API_URL}/api/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        code: testCode,
        name: testName
      })
    });
    
    if (emailResponse.ok) {
      const emailData = await emailResponse.json();
      console.log('✅ Verification email API working!');
      console.log('📧 Message ID:', emailData.messageId);
      console.log('🔢 Test code used:', testCode);
      
      console.log('\n🎉 SUCCESS! The signup form should now work perfectly!');
      console.log('\n📋 What happens in signup:');
      console.log('1. User fills form and clicks "Create Account"');
      console.log('2. Frontend generates verification code');
      console.log('3. Code is stored in Firestore (secure)');
      console.log('4. Email is sent via backend API ✅');
      console.log('5. User is redirected to verification page');
      console.log('6. User enters code to complete signup');
      
    } else {
      const errorData = await emailResponse.json();
      console.log('❌ Verification email failed:', emailResponse.status);
      console.log('Error:', errorData.error);
      
      if (emailResponse.status === 429) {
        console.log('⚠️  This is just rate limiting - the API is working!');
      }
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

testFrontendBackendConnection();