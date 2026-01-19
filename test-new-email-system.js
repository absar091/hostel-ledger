/**
 * Test script for the new email system
 * Tests all three new email templates: verification, welcome, and transaction alerts
 */

const BACKEND_URL = 'https://hostel-ledger-backend.vercel.app';

const testNewEmailSystem = async () => {
  console.log('🧪 Testing New Email System');
  console.log('============================');
  
  // Test data
  const testEmail = 'test@example.com';
  const testName = 'Test User';
  const testCode = '123456';
  
  // Test 1: Backend connectivity
  console.log('\n1. Testing backend connectivity...');
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is accessible:', data.message);
    } else {
      console.log('❌ Backend returned error:', response.status);
      return;
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
    return;
  }
  
  // Test 2: New verification email template
  console.log('\n2. Testing new verification email template...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/send-verification-new`, {
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
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ New verification email sent:', data.messageId);
    } else {
      const errorData = await response.json();
      console.log('❌ New verification email failed:', errorData.error);
    }
  } catch (error) {
    console.log('❌ New verification email test failed:', error.message);
  }
  
  // Test 3: Welcome email
  console.log('\n3. Testing welcome email...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        name: testName
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Welcome email sent:', data.messageId);
    } else {
      const errorData = await response.json();
      console.log('❌ Welcome email failed:', errorData.error);
    }
  } catch (error) {
    console.log('❌ Welcome email test failed:', error.message);
  }
  
  // Test 4: Transaction alert email
  console.log('\n4. Testing transaction alert email...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/send-transaction-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        name: testName,
        transactionType: 'New Expense',
        amount: 'Rs 1,500',
        groupName: 'Hostel Room 101',
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        description: 'Grocery shopping for the week'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Transaction alert email sent:', data.messageId);
    } else {
      const errorData = await response.json();
      console.log('❌ Transaction alert email failed:', errorData.error);
    }
  } catch (error) {
    console.log('❌ Transaction alert email test failed:', error.message);
  }
  
  // Test 5: Check all endpoints are listed
  console.log('\n5. Checking available endpoints...');
  try {
    const response = await fetch(`${BACKEND_URL}/`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Available endpoints:', Object.keys(data.endpoints));
      
      const expectedEndpoints = [
        'sendVerification',
        'sendWelcome', 
        'sendTransactionAlert'
      ];
      
      const hasAllEndpoints = expectedEndpoints.every(endpoint => 
        Object.keys(data.endpoints).some(key => key.includes(endpoint.replace('send', '').toLowerCase()))
      );
      
      if (hasAllEndpoints) {
        console.log('✅ All new endpoints are available');
      } else {
        console.log('⚠️ Some endpoints may be missing');
      }
    }
  } catch (error) {
    console.log('❌ Endpoint check failed:', error.message);
  }
  
  console.log('\n🎯 Test Summary:');
  console.log('- Backend connectivity: Check above results');
  console.log('- New verification template: Check above results');
  console.log('- Welcome email: Check above results');
  console.log('- Transaction alert: Check above results');
  console.log('- Endpoint availability: Check above results');
  
  console.log('\n📧 Email Integration Points:');
  console.log('1. Verification: Used during signup process');
  console.log('2. Welcome: Sent after email verification');
  console.log('3. Transaction alerts: Sent when transactions are created');
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Test the complete signup flow with new templates');
  console.log('2. Integrate transaction alerts into expense creation');
  console.log('3. Add user preferences for email notifications');
};

// Run the test
testNewEmailSystem().catch(console.error);