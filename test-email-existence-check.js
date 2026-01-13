// Test script to verify email existence check functionality
import { initializeApp } from 'firebase/app';
import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';

// Firebase config (using environment variables)
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

// Test email existence check function
const checkEmailExists = async (email) => {
  try {
    console.log('🔍 Checking if email exists:', email);
    
    // Primary check: Use Firebase Auth to check if email exists
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        console.log('❌ Email already exists in Firebase Auth:', email);
        console.log('🔐 Sign-in methods:', methods);
        return true;
      }
    } catch (authError) {
      console.warn('⚠️ Firebase Auth check failed:', authError.message);
      // If auth check fails, we can't determine if email exists
      // Return false to allow signup attempt (Firebase will catch duplicates during signup)
    }
    
    // Secondary check: Try to read from Realtime Database (will fail due to security rules, but that's OK)
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        console.log('📊 Found', Object.keys(users).length, 'users in database');
        
        // Search through all users to find matching email
        for (const uid in users) {
          if (users[uid].email === email) {
            console.log('❌ Email already exists in database:', email);
            console.log('👤 User details:', {
              uid,
              name: users[uid].name,
              email: users[uid].email,
              createdAt: users[uid].createdAt
            });
            return true;
          }
        }
        
        console.log('📋 Existing emails in database:');
        Object.values(users).forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.email} (${user.name})`);
        });
      } else {
        console.log('📭 No users found in database');
      }
    } catch (dbError) {
      console.log('ℹ️ Database check skipped (expected due to security rules):', dbError.message);
      // This is expected due to security rules - not an error
    }
    
    console.log('✅ Email is available:', email);
    return false;
    
  } catch (error) {
    console.error("❌ Error checking email existence:", error);
    return false;
  }
};

// Test function
const runTests = async () => {
  console.log('🧪 Testing Email Existence Check');
  console.log('==================================\n');
  
  // Test emails
  const testEmails = [
    'test@example.com',
    'user@hostel-ledger.com',
    'admin@test.com',
    'ahmadraoabsar@gmail.com',
  ];
  
  for (const email of testEmails) {
    console.log(`\n🔍 Testing email: ${email}`);
    console.log('─'.repeat(50));
    
    const exists = await checkEmailExists(email);
    
    console.log(`📊 Result: ${exists ? '❌ EXISTS' : '✅ AVAILABLE'}`);
    console.log('');
  }
  
  console.log('\n🎯 Test completed!');
  console.log('If you see emails that should exist but show as available,');
  console.log('or vice versa, there might be an issue with the check.');
};

// Run the tests
runTests().catch(console.error);