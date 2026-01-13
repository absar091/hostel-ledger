// Test Firebase Authentication configuration
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDnbnq_aO1JHFshsY4RmBoU0NiHOqnq9mU",
  authDomain: "hostel-ledger.firebaseapp.com",
  databaseURL: "https://hostel-ledger-default-rtdb.firebaseio.com",
  projectId: "hostel-ledger",
  storageBucket: "hostel-ledger.firebasestorage.app",
  messagingSenderId: "841373188948",
  appId: "1:841373188948:web:16c8dea6cfbdbaaebf7ec1",
  measurementId: "G-Z6GXYNNGYM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testFirebaseAuth() {
  console.log('🔍 Testing Firebase Authentication...');
  console.log('📍 Project ID:', firebaseConfig.projectId);
  console.log('📍 Auth Domain:', firebaseConfig.authDomain);
  
  try {
    // Test creating a user with a random email
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    console.log('\n1. Testing user creation...');
    console.log('📧 Test email:', testEmail);
    
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ User creation successful!');
    console.log('👤 User ID:', userCredential.user.uid);
    console.log('📧 User email:', userCredential.user.email);
    
    // Clean up - delete the test user
    await userCredential.user.delete();
    console.log('🗑️ Test user deleted');
    
    console.log('\n🎉 Firebase Authentication is working correctly!');
    console.log('✅ Email/Password provider is enabled');
    console.log('✅ Your signup should work now');
    
  } catch (error) {
    console.error('\n❌ Firebase Authentication Error:', error.code);
    console.error('📝 Error message:', error.message);
    
    switch (error.code) {
      case 'auth/admin-restricted-operation':
        console.log('\n🚨 SOLUTION REQUIRED:');
        console.log('1. Go to Firebase Console: https://console.firebase.google.com');
        console.log('2. Select project: hostel-ledger');
        console.log('3. Go to Authentication → Sign-in method');
        console.log('4. Enable "Email/Password" provider');
        console.log('5. Save changes');
        break;
        
      case 'auth/operation-not-allowed':
        console.log('\n🚨 Email/Password authentication is disabled');
        console.log('Enable it in Firebase Console → Authentication → Sign-in method');
        break;
        
      case 'auth/invalid-api-key':
        console.log('\n🚨 Invalid API key - check your Firebase configuration');
        break;
        
      default:
        console.log('\n🚨 Unknown error - check Firebase Console for more details');
    }
  }
}

// Run the test
testFirebaseAuth();