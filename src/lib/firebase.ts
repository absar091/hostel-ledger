import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';

// Your Firebase configuration for hostel-ledger project
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Initialize Firebase with error handling for offline
let app;
let auth;
let database;
let db;

try {
  app = initializeApp(firebaseConfig);
  
  // Only initialize auth and database if online or if they're already cached
  if (typeof window !== 'undefined') {
    // Always initialize auth (it has offline support)
    auth = getAuth(app);
    
    // Always initialize database (it has offline persistence)
    database = getDatabase(app);
    
    // Always initialize Firestore
    db = getFirestore(app);
    
    console.log('✅ Firebase initialized');
    
    if (!navigator.onLine) {
      console.log('📱 Offline mode - Firebase will use cached data');
    } else {
      console.log('🌐 Online mode - Firebase will sync with server');
    }
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  // App will still load, but Firebase features won't work
}

// Export with fallbacks
export { auth, database, db };

// Initialize Firebase Messaging (only in supported browsers)
let messaging: ReturnType<typeof getMessaging> | null = null;

// Initialize messaging asynchronously
const initMessaging = async () => {
  try {
    if (typeof window !== 'undefined' && navigator.onLine) {
      const supported = await isMessagingSupported();
      if (supported) {
        messaging = getMessaging(app);
        console.log('✅ Firebase Messaging initialized');
      } else {
        console.warn('⚠️ Firebase Messaging not supported in this browser');
      }
    }
  } catch (error) {
    console.warn('⚠️ Firebase Messaging initialization failed:', error);
  }
};

// Initialize messaging when module loads (only if online)
if (typeof window !== 'undefined' && navigator.onLine) {
  initMessaging();
}

// Helper to get messaging instance (waits for initialization if needed)
export const getMessagingInstance = async (): Promise<ReturnType<typeof getMessaging> | null> => {
  if (messaging) return messaging;
  
  // Don't wait if offline
  if (!navigator.onLine) {
    console.warn('⚠️ Cannot initialize Firebase Messaging while offline');
    return null;
  }
  
  // Wait for initialization (max 5 seconds)
  for (let i = 0; i < 50; i++) {
    if (messaging) return messaging;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.warn('⚠️ Firebase Messaging not initialized after 5 seconds');
  return null;
};

export { messaging };

// Default export
export default app;