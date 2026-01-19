// Test Firebase Authentication configuration with exact same setup as the app
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

// Use the exact same configuration as your app
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDnbnq_aO1JHFshsY4RmBoU0NiHOqnq9mU",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "hostel-ledger.firebaseapp.com",
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || "https://hostel-ledger-default-rtdb.firebaseio.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "hostel-ledger",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "hostel-ledger.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "841373188948",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:841373188948:web:16c8dea6cfbdbaaebf7ec1",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Z6GXYNNGYM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testFirebaseAuth() {
  console.log('🔍 Testing Firebase Authentication with EXACT app configuration...');
  console.log('📍 Project ID:', firebaseConfig.projectId);
  console.log('📍 Auth Domain:', firebaseConfig.authDomain);
  console.log('📍 API Key:', firebaseConfig.apiKey.substring(0, 10) + '...');
  
  try {
    // Test with the exact same email format you're using
    const testEmail = `test-${Date.now()}@gmail.com`;
    const testPassword = 'testpassword123';
    
    console.log('\n1. Testing user creation with Gmail address...');
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
    
    // Test with the exact email you're trying to use
    console.log('\n2. Testing with your actual email domain...');
    const yourTestEmail = 'test-' + Date.now() + '@gmail.com';
    console.log('📧 Testing with:', yourTestEmail);
    
    const userCredential2 = await createUserWithEmailAndPassword(auth, yourTestEmail, testPassword);
    console.log('✅ Your email domain works too!');
    await userCredential2.user.delete();
    console.log('🗑️ Test user deleted');
    
  } catch (error) {
    console.error('\n❌ Firebase Authentication Error:', error.code);
    console.error('📝 Error message:', error.message);
    
    switch (error.code) {
      case 'auth/admin-restricted-operation':
        console.log('\n🚨 CRITICAL: Email/Password authentication is DISABLED');
        console.log('📋 REQUIRED STEPS:');
        console.log('1. Go to: https://console.firebase.google.com');
        console.log('2. Select project: hostel-ledger');
        console.log('3. Go to: Authentication → Sign-in method');
        console.log('4. Find "Email/Password" in the list');
        console.log('5. Click on it and toggle "Enable" to ON');
        console.log('6. Click "Save"');
        console.log('7. Wait 1-2 minutes for changes to take effect');
        break;
        
      case 'auth/operation-not-allowed':
        console.log('\n🚨 Email/Password authentication is disabled');
        console.log('Enable it in Firebase Console → Authentication → Sign-in method');
        break;
        
      case 'auth/invalid-api-key':
        console.log('\n🚨 Invalid API key - check your Firebase configuration');
        break;
        
      case 'auth/project-not-found':
        console.log('\n🚨 Firebase project not found - check project ID');
        break;
        
      default:
        console.log('\n🚨 Unknown error:', error.code);
        console.log('Check Firebase Console for more details');
    }
    
    console.log('\n🔧 DEBUG INFO:');
    console.log('Project ID:', firebaseConfig.projectId);
    console.log('Auth Domain:', firebaseConfig.authDomain);
    console.log('API Key (first 10 chars):', firebaseConfig.apiKey.substring(0, 10));
  }
}

// Run the test
testFirebaseAuth();