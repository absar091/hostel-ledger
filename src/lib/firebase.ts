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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Messaging (only in supported browsers)
// Note: This must be initialized synchronously, not with await at top level
let messaging: ReturnType<typeof getMessaging> | null = null;

// Initialize messaging asynchronously
const initMessaging = async () => {
  try {
    if (typeof window !== 'undefined') {
      const supported = await isMessagingSupported();
      if (supported) {
        // Wait for service worker to be ready (PWA service worker)
        if ('serviceWorker' in navigator) {
          try {
            await navigator.serviceWorker.ready;
            console.log('✅ Service Worker ready');
            
            // Now initialize messaging with the existing service worker
            messaging = getMessaging(app);
            console.log('✅ Firebase Messaging initialized');
          } catch (swError) {
            console.error('❌ Service Worker error:', swError);
          }
        } else {
          console.warn('⚠️ Service Worker not supported');
        }
      } else {
        console.warn('⚠️ Firebase Messaging not supported in this browser');
      }
    }
  } catch (error) {
    console.warn('⚠️ Firebase Messaging initialization failed:', error);
  }
};

// Initialize messaging when module loads
if (typeof window !== 'undefined') {
  initMessaging();
}

// Helper to get messaging instance (waits for initialization if needed)
export const getMessagingInstance = async (): Promise<ReturnType<typeof getMessaging> | null> => {
  if (messaging) return messaging;
  
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