// Test backend transaction email API directly
async function testTransactionEmail() {
  console.log('🧪 Testing Backend Transaction Email API');
  console.log('=========================================');
  
  const backendUrl = 'http://localhost:3000'; // Use local backend for testing
  
  try {
    console.log('📧 Sending transaction alert email...');
    console.time('Email API Response Time');
    
    const response = await fetch(`${backendUrl}/api/send-transaction-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'ahmadraoabsar@gmail.com',
        name: 'Ahmad Rao',
        transactionType: 'New Expense',
        amount: 'Rs 500',
        groupName: 'Test Group',
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        description: 'Test expense for notification system'
      })
    });
    
    console.timeEnd('Email API Response Time');
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Transaction email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
    } else {
      console.log('❌ Transaction email failed:');
      console.log('📄 Response:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test email existence check
async function testEmailExistenceCheck() {
  console.log('\n🧪 Testing Email Existence Check');
  console.log('=================================');
  
  const backendUrl = 'http://localhost:3000'; // Use local backend for testing
  
  try {
    console.log('🔍 Checking email existence for: ahmadraoabsar@gmail.com');
    console.time('Email Check Response Time');
    
    const response = await fetch(`${backendUrl}/api/check-email-exists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'ahmadraoabsar@gmail.com'
      })
    });
    
    console.timeEnd('Email Check Response Time');
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Email existence check completed!');
      console.log('📊 Result:', result.exists ? 'Email EXISTS' : 'Email AVAILABLE');
      console.log('💬 Message:', result.message);
    } else {
      console.log('❌ Email existence check failed:');
      console.log('📄 Response:', result);
    }
    
  } catch (error) {
    console.error('❌ Email existence check failed:', error.message);
  }
}

// Run both tests
async function runAllTests() {
  await testTransactionEmail();
  await testEmailExistenceCheck();
}

runAllTests();