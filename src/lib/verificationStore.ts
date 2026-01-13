import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  Timestamp,
  getFirestore
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Initialize Firebase app and Firestore directly in this file to avoid import issues
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
const db = getFirestore(app);

// Verification code storage system using Firestore
interface VerificationRecord {
  code: string;
  email: string;
  userId?: string;
  type: 'signup' | 'password_reset' | 'email_change';
  attempts: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  verified: boolean;
}

class VerificationStore {
  private readonly MAX_ATTEMPTS = 3;
  private readonly EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes
  private readonly COLLECTION_NAME = 'verificationCodes';
  
  // Generate document ID from email (hash for security)
  private getDocId(email: string): string {
    return btoa(email.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  // Generate and store verification code in Firestore
  async generateCode(email: string, type: VerificationRecord['type'], userId?: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.EXPIRY_TIME);
    
    const record: any = {
      code,
      email: email.toLowerCase(),
      type,
      attempts: 0,
      createdAt: now,
      expiresAt: expiresAt,
      verified: false
    };

    // Only add userId if it's provided and not undefined
    if (userId) {
      record.userId = userId;
    }
    
    try {
      const docId = this.getDocId(email);
      await setDoc(doc(db, this.COLLECTION_NAME, docId), record);
      
      // Clean up expired codes periodically
      this.cleanupExpired();
      
      return code;
    } catch (error) {
      console.error('Error storing verification code:', error);
      throw new Error('Failed to generate verification code');
    }
  }
  
  // Store existing code in Firestore
  async storeCode(email: string, code: string, type: VerificationRecord['type'], userId?: string): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.EXPIRY_TIME);
    
    const record: any = {
      code,
      email: email.toLowerCase(),
      type,
      attempts: 0,
      createdAt: now,
      expiresAt: expiresAt,
      verified: false
    };

    // Only add userId if it's provided and not undefined
    if (userId) {
      record.userId = userId;
    }
    
    try {
      const docId = this.getDocId(email);
      await setDoc(doc(db, this.COLLECTION_NAME, docId), record);
    } catch (error) {
      console.error('Error storing verification code:', error);
      throw new Error('Failed to store verification code');
    }
  }
  
  // Verify code from Firestore
  async verifyCode(email: string, inputCode: string): Promise<{
    success: boolean;
    error?: string;
    attemptsLeft?: number;
  }> {
    try {
      const docId = this.getDocId(email);
      const docRef = doc(db, this.COLLECTION_NAME, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return { success: false, error: 'No verification code found. Please request a new one.' };
      }
      
      const record = docSnap.data() as VerificationRecord;
      const now = new Date();
      
      // Check if expired
      const expiresAt = record.expiresAt instanceof Timestamp ? record.expiresAt.toDate() : new Date(record.expiresAt);
      if (now > expiresAt) {
        await deleteDoc(docRef);
        return { success: false, error: 'Verification code has expired. Please request a new one.' };
      }
      
      // Check if already verified
      if (record.verified) {
        return { success: false, error: 'This verification code has already been used.' };
      }
      
      // Check attempts
      if (record.attempts >= this.MAX_ATTEMPTS) {
        await deleteDoc(docRef);
        return { success: false, error: 'Too many failed attempts. Please request a new verification code.' };
      }
      
      // Check code
      if (record.code !== inputCode) {
        // Increment attempts
        const newAttempts = record.attempts + 1;
        await updateDoc(docRef, { attempts: newAttempts });
        
        const attemptsLeft = this.MAX_ATTEMPTS - newAttempts;
        return { 
          success: false, 
          error: `Invalid verification code. ${attemptsLeft} attempts remaining.`,
          attemptsLeft 
        };
      }
      
      // Success - mark as verified and delete after a short delay
      await updateDoc(docRef, { verified: true });
      
      // Delete the code after successful verification
      setTimeout(async () => {
        try {
          await deleteDoc(docRef);
        } catch (error) {
          console.error('Error deleting verified code:', error);
        }
      }, 1000);
      
      return { success: true };
      
    } catch (error) {
      console.error('Error verifying code:', error);
      return { success: false, error: 'Failed to verify code. Please try again.' };
    }
  }
  
  // Check if code exists and is valid
  async hasValidCode(email: string): Promise<boolean> {
    try {
      const docId = this.getDocId(email);
      const docRef = doc(db, this.COLLECTION_NAME, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return false;
      
      const record = docSnap.data() as VerificationRecord;
      const now = new Date();
      const expiresAt = record.expiresAt instanceof Timestamp ? record.expiresAt.toDate() : new Date(record.expiresAt);
      
      return now <= expiresAt && !record.verified;
    } catch (error) {
      console.error('Error checking valid code:', error);
      return false;
    }
  }
  
  // Get remaining time for code
  async getRemainingTime(email: string): Promise<number> {
    try {
      const docId = this.getDocId(email);
      const docRef = doc(db, this.COLLECTION_NAME, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return 0;
      
      const record = docSnap.data() as VerificationRecord;
      const now = new Date();
      const expiresAt = record.expiresAt instanceof Timestamp ? record.expiresAt.toDate() : new Date(record.expiresAt);
      
      return Math.max(0, expiresAt.getTime() - now.getTime());
    } catch (error) {
      console.error('Error getting remaining time:', error);
      return 0;
    }
  }
  
  // Remove code from Firestore
  async removeCode(email: string): Promise<void> {
    try {
      const docId = this.getDocId(email);
      const docRef = doc(db, this.COLLECTION_NAME, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error removing code:', error);
    }
  }
  
  // Clean up expired codes
  private async cleanupExpired(): Promise<void> {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('expiresAt', '<', now)
      );
      
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  }
  
  // Get code info (for debugging/admin purposes)
  async getCodeInfo(email: string): Promise<Partial<VerificationRecord> | null> {
    try {
      const docId = this.getDocId(email);
      const docRef = doc(db, this.COLLECTION_NAME, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      const record = docSnap.data() as VerificationRecord;
      return {
        type: record.type,
        attempts: record.attempts,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        verified: record.verified
      };
    } catch (error) {
      console.error('Error getting code info:', error);
      return null;
    }
  }
  
  // Resend code (generates new code, resets attempts)
  async resendCode(email: string): Promise<string | null> {
    try {
      const docId = this.getDocId(email);
      const docRef = doc(db, this.COLLECTION_NAME, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      const record = docSnap.data() as VerificationRecord;
      
      // Generate new code with same type
      return await this.generateCode(email, record.type, record.userId);
    } catch (error) {
      console.error('Error resending code:', error);
      return null;
    }
  }
}

// Export singleton instance
export const verificationStore = new VerificationStore();

// Helper functions
export const generateVerificationCode = async (email: string, type: 'signup' | 'password_reset' | 'email_change', userId?: string): Promise<string> => {
  return await verificationStore.generateCode(email, type, userId);
};

export const storeVerificationCode = async (email: string, code: string, type: 'signup' | 'password_reset' | 'email_change', userId?: string): Promise<void> => {
  return await verificationStore.storeCode(email, code, type, userId);
};

export const verifyVerificationCode = async (email: string, code: string) => {
  return await verificationStore.verifyCode(email, code);
};

export const hasValidVerificationCode = async (email: string): Promise<boolean> => {
  return await verificationStore.hasValidCode(email);
};

export const getVerificationTimeRemaining = async (email: string): Promise<number> => {
  return await verificationStore.getRemainingTime(email);
};

export const resendVerificationCode = async (email: string): Promise<string | null> => {
  return await verificationStore.resendCode(email);
};