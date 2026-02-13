import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { callSecureApi } from "@/lib/api";

/**
 * Clean up unverified accounts that are older than 24 hours
 * This function calls the backend API to perform the cleanup securely (requiring Admin SDK)
 */
export const cleanupUnverifiedAccounts = async (): Promise<{ 
  success: boolean; 
  deletedCount: number; 
  error?: string 
}> => {
  try {
    console.log('🧹 Requesting cleanup of unverified accounts...');
    
    const result = await callSecureApi('/api/cleanup-unverified-users', {});
    
    if (result.success) {
        console.log(`✅ Cleanup completed via backend. Deleted ${result.deletedCount} unverified accounts`);
        logger.info('Unverified account cleanup triggered successfully', { deletedCount: result.deletedCount });
        return { success: true, deletedCount: result.deletedCount };
    } else {
        throw new Error(result.error || 'Unknown error from backend');
    }
    
  } catch (error: any) {
    console.error('❌ Account cleanup request failed:', error);
    logger.error('Account cleanup request failed', { error: error.message });
    return { 
      success: false, 
      deletedCount: 0, 
      error: error.message || 'Cleanup request failed'
    };
  }
};

/**
 * Check if a specific account should be cleaned up
 */
export const shouldCleanupAccount = async (uid: string): Promise<boolean> => {
  try {
    const verificationRef = ref(database, `emailVerification/${uid}`);
    const snapshot = await get(verificationRef);
    
    if (!snapshot.exists()) {
      return false;
    }
    
    const data = snapshot.val();
    
    // Don't clean up if already verified
    if (data.emailVerified) {
      return false;
    }
    
    // Check if older than 24 hours
    const createdAt = new Date(data.createdAt);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return createdAt < twentyFourHoursAgo;
    
  } catch (error) {
    console.error('Error checking account cleanup status:', error);
    return false;
  }
};

/**
 * Get statistics about unverified accounts
 */
export const getUnverifiedAccountStats = async (): Promise<{
  total: number;
  oldAccounts: number;
  recentAccounts: number;
}> => {
  try {
    const verificationRef = ref(database, 'emailVerification');
    const snapshot = await get(verificationRef);
    
    if (!snapshot.exists()) {
      return { total: 0, oldAccounts: 0, recentAccounts: 0 };
    }
    
    const accounts = snapshot.val();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    let total = 0;
    let oldAccounts = 0;
    let recentAccounts = 0;
    
    Object.values(accounts).forEach((account: any) => {
      if (!account.emailVerified) {
        total++;
        const createdAt = new Date(account.createdAt);
        
        if (createdAt < twentyFourHoursAgo) {
          oldAccounts++;
        } else {
          recentAccounts++;
        }
      }
    });
    
    return { total, oldAccounts, recentAccounts };
    
  } catch (error) {
    console.error('Error getting unverified account stats:', error);
    return { total: 0, oldAccounts: 0, recentAccounts: 0 };
  }
};
