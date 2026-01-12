import { useState } from 'react';
import { database } from '@/lib/firebase';
import { ref, push, set } from 'firebase/database';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';

const FirebasePermissionTest = () => {
  const { user } = useFirebaseAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (message: string, success: boolean) => {
    const result = `${success ? '✅' : '❌'} ${message}`;
    setTestResults(prev => [...prev, result]);
    console.log(result);
  };

  const runPermissionTests = async () => {
    if (!user) {
      addTestResult('No user authenticated', false);
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    addTestResult('🚀 Starting Firebase Permission Tests...', true);

    try {
      // Test 1: Create a test group
      addTestResult('Test 1: Creating test group...', true);
      const groupRef = push(ref(database, 'groups'));
      const groupId = groupRef.key!;
      
      const testGroup = {
        id: groupId,
        name: 'Test Group',
        emoji: '🧪',
        members: [
          { id: user.uid, name: 'You' },
          { id: 'test_member_123', name: 'Test Member' }
        ],
        createdBy: user.uid,
        createdAt: Date.now()
      };

      await set(groupRef, testGroup);
      
      // Add to userGroups
      await set(ref(database, `userGroups/${user.uid}/${groupId}`), true);
      addTestResult('✅ Test 1: Group created successfully', true);

      // Test 2: Create wallet transaction
      addTestResult('Test 2: Creating wallet transaction...', true);
      const walletTransactionRef = push(ref(database, 'transactions'));
      const walletTransactionId = walletTransactionRef.key!;
      
      const walletTransaction = {
        id: walletTransactionId,
        type: 'wallet_add',
        title: 'Test wallet add',
        amount: 1000,
        date: new Date().toISOString(),
        paidBy: user.uid,
        paidByName: user.name || 'Test User',
        createdAt: Date.now()
      };

      await set(walletTransactionRef, walletTransaction);
      await set(ref(database, `userTransactions/${user.uid}/${walletTransactionId}`), true);
      addTestResult('✅ Test 2: Wallet transaction created successfully', true);

      // Test 3: Create expense transaction
      addTestResult('Test 3: Creating expense transaction...', true);
      const expenseTransactionRef = push(ref(database, 'transactions'));
      const expenseTransactionId = expenseTransactionRef.key!;
      
      const expenseTransaction = {
        id: expenseTransactionId,
        type: 'expense',
        title: 'Test expense',
        amount: 500,
        date: new Date().toISOString(),
        groupId: groupId,
        paidBy: user.uid,
        paidByName: user.name || 'Test User',
        participants: [
          { id: user.uid, name: 'You', amount: 250 },
          { id: 'test_member_123', name: 'Test Member', amount: 250 }
        ],
        note: 'Test expense note',
        place: 'Test location',
        createdAt: Date.now()
      };

      await set(expenseTransactionRef, expenseTransaction);
      await set(ref(database, `userTransactions/${user.uid}/${expenseTransactionId}`), true);
      addTestResult('✅ Test 3: Expense transaction created successfully', true);

      // Test 4: Create payment transaction
      addTestResult('Test 4: Creating payment transaction...', true);
      const paymentTransactionRef = push(ref(database, 'transactions'));
      const paymentTransactionId = paymentTransactionRef.key!;
      
      const paymentTransaction = {
        id: paymentTransactionId,
        type: 'payment',
        title: 'Test payment received',
        amount: 200,
        date: new Date().toISOString(),
        groupId: groupId,
        fromMember: 'test_member_123',
        toMember: user.uid,
        fromName: 'Test Member',
        toName: user.name || 'Test User',
        method: 'cash',
        note: 'Test payment note',
        createdAt: Date.now()
      };

      await set(paymentTransactionRef, paymentTransaction);
      await set(ref(database, `userTransactions/${user.uid}/${paymentTransactionId}`), true);
      addTestResult('✅ Test 4: Payment transaction created successfully', true);

      // Test 5: Update user settlements
      addTestResult('Test 5: Updating user settlements...', true);
      const settlementData = {
        toReceive: 300,
        toPay: 100
      };
      
      await set(ref(database, `users/${user.uid}/settlements/${groupId}/test_member_123`), settlementData);
      addTestResult('✅ Test 5: User settlements updated successfully', true);

      addTestResult('🎉 ALL TESTS PASSED! Firebase permissions are working correctly.', true);

    } catch (error: any) {
      addTestResult(`❌ Test failed: ${error.message}`, false);
      console.error('Firebase permission test error:', error);
      
      // Provide specific guidance based on error type
      if (error.message.includes('PERMISSION_DENIED')) {
        addTestResult('💡 SOLUTION: Deploy the updated Firebase rules to fix permissions', false);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!user) {
    return (
      <div className="p-6 glass-card">
        <h3 className="text-lg font-semibold text-foreground mb-2">🔥 Firebase Permission Test</h3>
        <p className="text-muted-foreground">Please log in to run permission tests.</p>
      </div>
    );
  }

  return (
    <div className="p-6 glass-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">🔥 Firebase Permission Test</h3>
      
      <div className="flex gap-3 mb-4">
        <button
          onClick={runPermissionTests}
          disabled={isRunning}
          className="btn-primary-teal"
        >
          {isRunning ? '🔄 Running Tests...' : '🚀 Run Permission Tests'}
        </button>
        
        <button
          onClick={clearResults}
          className="btn-secondary-teal"
        >
          🗑️ Clear Results
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="glass-card p-4 max-h-96 overflow-y-auto">
          <h4 className="font-medium text-foreground mb-3">📊 Test Results:</h4>
          <div className="space-y-1 font-mono text-sm">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`${
                  result.startsWith('✅') ? 'text-green-400' : 
                  result.startsWith('❌') ? 'text-red-400' : 
                  result.startsWith('🎉') ? 'text-cyan-400 font-bold' :
                  result.startsWith('💡') ? 'text-yellow-400' :
                  'text-foreground'
                }`}
              >
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-muted-foreground">
        <p className="mb-2">🧪 <strong>This test verifies all Firebase operations:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>✅ Create groups and add user to group</li>
          <li>💰 Create wallet transactions (add money)</li>
          <li>💸 Create expense transactions</li>
          <li>💳 Create payment transactions</li>
          <li>⚖️ Update user settlements</li>
        </ul>
        
        <div className="mt-4 p-3 glass-card bg-cyan-500/10 border-cyan-400/20">
          <p className="text-cyan-400 font-medium">📋 How to run this test:</p>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
            <li>Make sure you're logged in to the app</li>
            <li>Click "🚀 Run Permission Tests" button above</li>
            <li>Watch the results appear in real-time</li>
            <li>If tests fail, deploy the updated Firebase rules</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default FirebasePermissionTest;