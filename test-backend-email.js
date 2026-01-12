// Test script for backend email API
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001';

async function testEmailAPI() {
  console.log('🧪 Testing Backend Email API...\n');

  // Test 1: Health Check
  try {
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${API_URL}/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok) {
      console.log('✅ Health check passed:', healthData.message);
    } else {
      console.log('❌ Health check failed');
      return;
    }
  } catch (error) {
    console.log('❌ Backend server not running:', error.message);
    console.log('💡 Please start the backend server first: npm start');
    return;
  }

  // Test 2: Send Verification Email
  try {
    console.log('\n2️⃣ Testing verification email...');
    const verificationResponse = await fetch(`${API_URL}/api/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com', // Change this to your email to receive test
        code: '123456',
        name: 'Test User'
      }),
    });

    const verificationData = await verificationResponse.json();
    
    if (verificationResponse.ok) {
      console.log('✅ Verification email sent successfully!');
      console.log('📧 Message ID:', verificationData.messageId);
    } else {
      console.log('❌ Verification email failed:', verificationData.error);
    }
  } catch (error) {
    console.log('❌ Verification email error:', error.message);
  }

  // Test 3: Send Password Reset Email
  try {
    console.log('\n3️⃣ Testing password reset email...');
    const resetResponse = await fetch(`${API_URL}/api/send-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com', // Change this to your email to receive test
        resetLink: 'http://localhost:5173/reset-password?token=test123',
        name: 'Test User'
      }),
    });

    const resetData = await resetResponse.json();
    
    if (resetResponse.ok) {
      console.log('✅ Password reset email sent successfully!');
      console.log('📧 Message ID:', resetData.messageId);
    } else {
      console.log('❌ Password reset email failed:', resetData.error);
    }
  } catch (error) {
    console.log('❌ Password reset email error:', error.message);
  }

  console.log('\n🎉 Email API testing completed!');
  console.log('💡 To receive actual emails, change the email addresses in this script to your real email.');
}

// Run the test
testEmailAPI();