/**
 * Test script for the new authentication flow
 * This script tests the complete signup and verification process
 */

const testAuthFlow = async () => {
  console.log('🧪 Testing New Authentication Flow');
  console.log('=====================================');
  
  // Test 1: Check if backend is accessible
  console.log('\n1. Testing backend connectivity...');
  try {
    const response = await fetch('https://hostel-ledger-backend.vercel.app/health');
    if (response.ok) {
      console.log('✅ Backend is accessible');
    } else {
      console.log('❌ Backend returned error:', response.status);
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
  }
  
  // Test 2: Test email sending capability
  console.log('\n2. Testing email sending...');
  try {
    const testEmail = 'test@example.com';
    const testCode = '123456';
    
    const emailResponse = await fetch('https://hostel-ledger-backend.vercel.app/send-verification-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        code: testCode,
        name: 'Test User'
      })
    });
    
    if (emailResponse.ok) {
      console.log('✅ Email sending endpoint is working');
    } else {
      const errorText = await emailResponse.text();
      console.log('❌ Email sending failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Email test failed:', error.message);
  }
  
  // Test 3: Check Firebase configuration
  console.log('\n3. Testing Firebase configuration...');
  try {
    // This would need to be run in a browser environment with Firebase initialized
    console.log('⚠️ Firebase tests need to be run in browser environment');
    console.log('   - Check if Firebase Auth is enabled');
    console.log('   - Check if Realtime Database is configured');
    console.log('   - Check if Firestore is configured');
  } catch (error) {
    console.log('❌ Firebase test failed:', error.message);
  }
  
  console.log('\n🎯 Test Summary:');
  console.log('- Backend connectivity: Check manually');
  console.log('- Email sending: Check manually');
  console.log('- Firebase config: Check in browser');
  console.log('\n📋 Manual Testing Steps:');
  console.log('1. Open the app in browser');
  console.log('2. Go to signup page');
  console.log('3. Fill in basic information');
  console.log('4. Continue to password step');
  console.log('5. Create account');
  console.log('6. Check email for verification code');
  console.log('7. Enter code and verify');
  console.log('8. Should redirect to dashboard');
};

// Run the test
testAuthFlow().catch(console.error);