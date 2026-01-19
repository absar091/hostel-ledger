sebase/**
 * Firebase Database Rules Testing
 * Run this with: node test-firebase-rules.js
 * 
 * This script tests both Realtime Database and Firestore rules
 * to ensure no permission errors occur during normal operations
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDatabase, ref, set, get, push, update, remove } from 'firebase/database';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Firebase configuration (use your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyDnbnq_aO1JHFshsY4RmBoU0NiHOqnq9mU",
  authDomain: "hostel-ledger.firebaseapp.com",
  databaseURL: "https://hostel-ledger-default-rtdb.firebaseio.com",
  projectId: "hostel-ledger",
  storageBucket: "hostel-ledger.firebasestorage.app",
  messagingSenderId: "841373188948",
  appId: "1:841373188948:web:16c8dea6cfbdbaaebf7ec1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const firestore = getFirestore(app);

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

const testUser2 = {
  email: 'test2@example.com',
  password: 'testpassword123',
  name: 'Test User 2'
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName, success, error = null) {
  if (success) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}: ${error}`);
    testResults.failed++;
    testResults.errors.push({ test: testName, error });
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Realtime Database Tests
async function testRealtimeDatabase() {
  console.log('\n🔥 Testing Firebase Realtime Database Rules...\n');
  
  let user1, user2;
  
  try {
    // Test 1: Create test users
    try {
      user1 = await createUserWithEmailAndPassword(auth, testUser.email, testUser.password);
      logTest('Create test user 1', true);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        user1 = await signInWithEmailAndPassword(auth, testUser.email, testUser.password);
        logTest('Sign in existing test user 1', true);
      } else {
        throw error;
      }
    }

    // Test 2: User can create their own profile
    try {
      const userProfile = {
        uid: user1.user.uid,
        email: testUser.email,
        name: testUser.name,
        walletBalance: 0,
        settlements: {},
        createdAt: new Date().toISOString()
      };
      
      await set(ref(database, `users/${user1.user.uid}`), userProfile);
      logTest('User can create own profile', true);
    } catch (error) {
      logTest('User can create own profile', false, error.message);
    }

    // Test 3: User can read their own profile
    try {
      const snapshot = await get(ref(database, `users/${user1.user.uid}`));
      if (snapshot.exists()) {
        logTest('User can read own profile', true);
      } else {
        logTest('User can read own profile', false, 'Profile not found');
      }
    } catch (error) {
      logTest('User can read own profile', false, error.message);
    }

    // Test 4: User can update their own profile
    try {
      await update(ref(database, `users/${user1.user.uid}`), {
        name: 'Updated Test User',
        walletBalance: 100
      });
      logTest('User can update own profile', true);
    } catch (error) {
      logTest('User can update own profile', false, error.message);
    }

    // Test 5: User can create a group
    try {
      const groupData = {
        name: 'Test Group',
        emoji: '🏠',
        members: [
          {
            id: user1.user.uid,
            name: 'Test User',
            isCurrentUser: true
          }
        ],
        createdBy: user1.user.uid,
        createdAt: new Date().toISOString()
      };
      
      const groupRef = push(ref(database, 'groups'));
      const groupId = groupRef.key;
      
      await set(groupRef, groupData);
      
      // Add to user's groups
      await set(ref(database, `userGroups/${user1.user.uid}/${groupId}`), true);
      
      logTest('User can create group', true);
      
      // Store groupId for later tests
      global.testGroupId = groupId;
    } catch (error) {
      logTest('User can create group', false, error.message);
    }

    // Test 6: User can create transactions
    try {
      const transactionData = {
        groupId: global.testGroupId,
        type: 'expense',
        title: 'Test Expense',
        amount: 50,
        date: new Date().toLocaleDateString(),
        paidBy: user1.user.uid,
        paidByName: 'Test User',
        participants: [{
          id: user1.user.uid,
          name: 'Test User',
          amount: 50
        }],
        createdAt: new Date().toISOString()
      };
      
      const transactionRef = push(ref(database, 'transactions'));
      const transactionId = transactionRef.key;
      
      await set(transactionRef, transactionData);
      
      // Add to user's transactions
      await set(ref(database, `userTransactions/${user1.user.uid}/${transactionId}`), true);
      
      logTest('User can create transactions', true);
      
      global.testTransactionId = transactionId;
    } catch (error) {
      logTest('User can create transactions', false, error.message);
    }

    // Test 7: User can read their transactions
    try {
      const snapshot = await get(ref(database, `transactions/${global.testTransactionId}`));
      if (snapshot.exists()) {
        logTest('User can read own transactions', true);
      } else {
        logTest('User can read own transactions', false, 'Transaction not found');
      }
    } catch (error) {
      logTest('User can read own transactions', false, error.message);
    }

    // Test 8: User can update their transactions
    try {
      await update(ref(database, `transactions/${global.testTransactionId}`), {
        title: 'Updated Test Expense',
        amount: 75
      });
      logTest('User can update own transactions', true);
    } catch (error) {
      logTest('User can update own transactions', false, error.message);
    }

    // Test 9: Create second user for permission tests
    try {
      user2 = await createUserWithEmailAndPassword(auth, testUser2.email, testUser2.password);
      logTest('Create test user 2', true);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        user2 = await signInWithEmailAndPassword(auth, testUser2.email, testUser2.password);
        logTest('Sign in existing test user 2', true);
      } else {
        throw error;
      }
    }

    // Test 10: User 2 cannot read User 1's profile
    try {
      const snapshot = await get(ref(database, `users/${user1.user.uid}`));
      logTest('User 2 cannot read User 1 profile', false, 'Should have been denied');
    } catch (error) {
      if (error.message.includes('permission') || error.message.includes('denied')) {
        logTest('User 2 cannot read User 1 profile', true);
      } else {
        logTest('User 2 cannot read User 1 profile', false, error.message);
      }
    }

    // Test 11: User 2 cannot access User 1's transactions
    try {
      const snapshot = await get(ref(database, `transactions/${global.testTransactionId}`));
      logTest('User 2 cannot read User 1 transactions', false, 'Should have been denied');
    } catch (error) {
      if (error.message.includes('permission') || error.message.includes('denied')) {
        logTest('User 2 cannot read User 1 transactions', true);
      } else {
        logTest('User 2 cannot read User 1 transactions', false, error.message);
      }
    }

    // Test 12: Email verification tests
    try {
      await set(ref(database, `emailVerification/${user1.user.uid}`), {
        email: testUser.email,
        emailVerified: true,
        verifiedAt: new Date().toISOString()
      });
      logTest('User can set email verification', true);
    } catch (error) {
      logTest('User can set email verification', false, error.message);
    }

  } catch (error) {
    console.error('❌ Realtime Database test setup failed:', error.message);
  }
}

// Firestore Tests
async function testFirestore() {
  console.log('\n🔥 Testing Firestore Rules...\n');
  
  let user1, user2;
  
  try {
    // Sign in as user 1
    user1 = await signInWithEmailAndPassword(auth, testUser.email, testUser.password);
    
    // Test 1: User can create their own profile in Firestore
    try {
      const userProfile = {
        uid: user1.user.uid,
        email: testUser.email,
        name: testUser.name,
        walletBalance: 0,
        settlements: {},
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(firestore, 'users', user1.user.uid), userProfile);
      logTest('Firestore: User can create own profile', true);
    } catch (error) {
      logTest('Firestore: User can create own profile', false, error.message);
    }

    // Test 2: User can read their own profile from Firestore
    try {
      const docSnap = await getDoc(doc(firestore, 'users', user1.user.uid));
      if (docSnap.exists()) {
        logTest('Firestore: User can read own profile', true);
      } else {
        logTest('Firestore: User can read own profile', false, 'Profile not found');
      }
    } catch (error) {
      logTest('Firestore: User can read own profile', false, error.message);
    }

    // Test 3: User can update their own profile in Firestore
    try {
      await updateDoc(doc(firestore, 'users', user1.user.uid), {
        name: 'Updated Firestore User',
        walletBalance: 200
      });
      logTest('Firestore: User can update own profile', true);
    } catch (error) {
      logTest('Firestore: User can update own profile', false, error.message);
    }

    // Test 4: User can create a group in Firestore
    try {
      const groupData = {
        name: 'Firestore Test Group',
        emoji: '🏢',
        members: [
          {
            id: user1.user.uid,
            name: 'Test User',
            isCurrentUser: true
          }
        ],
        createdBy: user1.user.uid,
        createdAt: new Date().toISOString()
      };
      
      const groupRef = await addDoc(collection(firestore, 'groups'), groupData);
      const groupId = groupRef.id;
      
      // Add to user's groups
      await setDoc(doc(firestore, 'userGroups', user1.user.uid), {
        [groupId]: true
      });
      
      logTest('Firestore: User can create group', true);
      
      global.firestoreGroupId = groupId;
    } catch (error) {
      logTest('Firestore: User can create group', false, error.message);
    }

    // Test 5: User can create transactions in Firestore
    try {
      const transactionData = {
        groupId: global.firestoreGroupId,
        type: 'expense',
        title: 'Firestore Test Expense',
        amount: 100,
        date: new Date().toLocaleDateString(),
        paidBy: user1.user.uid,
        paidByName: 'Test User',
        participants: [{
          id: user1.user.uid,
          name: 'Test User',
          amount: 100
        }],
        createdAt: new Date().toISOString()
      };
      
      const transactionRef = await addDoc(collection(firestore, 'transactions'), transactionData);
      const transactionId = transactionRef.id;
      
      // Add to user's transactions
      await setDoc(doc(firestore, 'userTransactions', user1.user.uid), {
        [transactionId]: true
      });
      
      logTest('Firestore: User can create transactions', true);
      
      global.firestoreTransactionId = transactionId;
    } catch (error) {
      logTest('Firestore: User can create transactions', false, error.message);
    }

    // Test 6: User can read their transactions from Firestore
    try {
      const docSnap = await getDoc(doc(firestore, 'transactions', global.firestoreTransactionId));
      if (docSnap.exists()) {
        logTest('Firestore: User can read own transactions', true);
      } else {
        logTest('Firestore: User can read own transactions', false, 'Transaction not found');
      }
    } catch (error) {
      logTest('Firestore: User can read own transactions', false, error.message);
    }

    // Test 7: Sign in as user 2 for permission tests
    user2 = await signInWithEmailAndPassword(auth, testUser2.email, testUser2.password);

    // Test 8: User 2 cannot read User 1's profile in Firestore
    try {
      const docSnap = await getDoc(doc(firestore, 'users', user1.user.uid));
      logTest('Firestore: User 2 cannot read User 1 profile', false, 'Should have been denied');
    } catch (error) {
      if (error.message.includes('permission') || error.message.includes('denied') || error.code === 'permission-denied') {
        logTest('Firestore: User 2 cannot read User 1 profile', true);
      } else {
        logTest('Firestore: User 2 cannot read User 1 profile', false, error.message);
      }
    }

    // Test 9: User 2 cannot access User 1's transactions in Firestore
    try {
      const docSnap = await getDoc(doc(firestore, 'transactions', global.firestoreTransactionId));
      logTest('Firestore: User 2 cannot read User 1 transactions', false, 'Should have been denied');
    } catch (error) {
      if (error.message.includes('permission') || error.message.includes('denied') || error.code === 'permission-denied') {
        logTest('Firestore: User 2 cannot read User 1 transactions', true);
      } else {
        logTest('Firestore: User 2 cannot read User 1 transactions', false, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Firestore test setup failed:', error.message);
  }
}

// Cleanup function
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...\n');
  
  try {
    // Sign in as user 1 to clean up their data
    await signInWithEmailAndPassword(auth, testUser.email, testUser.password);
    
    // Clean up Realtime Database
    if (global.testTransactionId) {
      await remove(ref(database, `transactions/${global.testTransactionId}`));
      await remove(ref(database, `userTransactions/${auth.currentUser.uid}/${global.testTransactionId}`));
    }
    
    if (global.testGroupId) {
      await remove(ref(database, `groups/${global.testGroupId}`));
      await remove(ref(database, `userGroups/${auth.currentUser.uid}/${global.testGroupId}`));
    }
    
    await remove(ref(database, `users/${auth.currentUser.uid}`));
    await remove(ref(database, `emailVerification/${auth.currentUser.uid}`));
    
    // Clean up Firestore
    if (global.firestoreTransactionId) {
      await deleteDoc(doc(firestore, 'transactions', global.firestoreTransactionId));
      await deleteDoc(doc(firestore, 'userTransactions', auth.currentUser.uid));
    }
    
    if (global.firestoreGroupId) {
      await deleteDoc(doc(firestore, 'groups', global.firestoreGroupId));
      await deleteDoc(doc(firestore, 'userGroups', auth.currentUser.uid));
    }
    
    await deleteDoc(doc(firestore, 'users', auth.currentUser.uid));
    
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.log('⚠️ Cleanup had some issues:', error.message);
  }
  
  await signOut(auth);
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Firebase Rules Testing...\n');
  console.log('This will test both Realtime Database and Firestore rules');
  console.log('to ensure no permission errors occur during normal operations.\n');
  
  try {
    await testRealtimeDatabase();
    await sleep(2000); // Wait between test suites
    await testFirestore();
    
    // Print results
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.errors.forEach(error => {
        console.log(`   • ${error.test}: ${error.error}`);
      });
    }
    
    if (testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Your Firebase rules are working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check your Firebase rules configuration.');
    }
    
  } catch (error) {
    console.error('❌ Test runner failed:', error);
  } finally {
    await cleanup();
  }
}

// Run the tests
runTests().catch(console.error);