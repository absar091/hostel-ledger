import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration for hostel-ledger project
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDnbnq_aO1JHFshsY4RmBoU0NiHOqnq9mU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hostel-ledger.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://hostel-ledger-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hostel-ledger",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hostel-ledger.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "841373188948",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:841373188948:web:16c8dea6cfbdbaaebf7ec1",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Z6GXYNNGYM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Default export
export default app;