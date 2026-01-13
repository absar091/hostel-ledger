import { sendTransactionNotifications } from './src/lib/transactionNotifications.js';

// Test transaction notification system
async function testTransactionNotifications() {
  console.log('🧪 Testing Transaction Notification System');
  console.log('==========================================');
  
  try {
    // Mock transaction data
    const transactionData = {
      id: 'test-transaction-123',
      type: 'expense',
      title: 'Test Expense',
      amount: 500,
      groupId: 'test-group-123',
      groupName: 'Test Group',
      paidBy: 'user-123',
      paidByName: 'Test User',
      participants: ['user-456'],
      date: new Date().toISOString(),
      description: 'Test expense for notification system',
      method: 'cash'
    };
    
    // Mock user data
    const userData = [{
      uid: 'user-456',
      email: 'ahmadraoabsar@gmail.com',
      name: 'Ahmad Rao'
    }];
    
    console.log('📧 Sending test transaction notification...');
    console.time('Email Send Time');
    
    const result = await sendTransactionNotifications(transactionData, userData);
    
    console.timeEnd('Email Send Time');
    
    if (result.success) {
      console.log('✅ Transaction notification sent successfully!');
    } else {
      console.log('❌ Transaction notification failed:');
      result.errors.forEach(error => console.log('  -', error));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTransactionNotifications();