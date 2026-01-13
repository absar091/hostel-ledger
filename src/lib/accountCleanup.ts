import { ref, get, remove, query, orderByChild, endAt } from "firebase/database";
import { deleteUser } from "firebase/auth";
import { database, auth } from "@/lib/firebase";
import { logger } from "@/lib/logger";

/**
 * Clean up unverified accounts that are older than 24 hours
 * This function should be called periodically (e.g., daily via a cron job or cloud function)
 */
export const cleanupUnverifiedAccounts = async (): Promise<{ 
  success: boolean; 
  deletedCount: number; 
  error?: string 
}> => {
  try {
    console.log('🧹 Starting cleanup of unverified accounts...');
    
    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Query unverified accounts older than 24 hours
    const verificationRef = ref(database, 'emailVerification');
    const oldAccountsQuery = query(
      verificationRef,
      orderByChild('createdAt'),
      endAt(twentyFourHoursAgo)
    );
    
    const snapshot = await get(oldAccountsQuery);
    
    if (!snapshot.exists()) {
      console.log('✅ No unverified accounts to clean up');
      return { success: true, deletedCount: 0 };
    }
    
    const accountsToDelete = snapshot.val();
    let deletedCount = 0;
    const errors: string[] = [];
    
    // Process each unverified account
    for (const [uid, accountData] of Object.entries(accountsToDelete)) {
      try {
        const account = accountData as { 
          emailVerified: boolean; 
          createdAt: string; 
          email: string 
        };
        
        // Skip if already verified
        if (account.emailVerified) {
          continue;
        }
        
        console.log(`🗑️ Deleting unverified account: ${account.email} (${uid})`);
        
        // Delete from Firebase Auth (if user still exists)
        try {
          // Note: In a real implementation, you'd need admin SDK to delete users by UID
          // For now, we'll just clean up the database records
          console.log(`⚠️ Cannot delete Firebase Auth user ${uid} - requires admin SDK`);
        } catch (authError) {
          console.warn(`Failed to delete Firebase Auth user ${uid}:`, authError);
        }
        
        // Delete user profile from database
        const userRef = ref(database, `users/${uid}`);
        await remove(userRef);
        
        // Delete email verification record
        const verificationRecordRef = ref(database, `emailVerification/${uid}`);
        await remove(verificationRecordRef);
        
        // Clean up any verification codes
        const codesRef = ref(database, `verificationCodes/${account.email}`);
        await remove(codesRef);
        
        deletedCount++;
        logger.info('Unverified account cleaned up', { 
          uid, 
          email: account.email, 
          createdAt: account.createdAt 
        });
        
      } catch (error: any) {
        const errorMsg = `Failed to delete account ${uid}: ${error.message}`;
        errors.push(errorMsg);
        logger.error('Account cleanup failed', { uid, error: error.message });
      }
    }
    
    console.log(`✅ Cleanup completed. Deleted ${deletedCount} unverified accounts`);
    
    if (errors.length > 0) {
      return { 
        success: false, 
        deletedCount, 
        error: `Partial cleanup completed. Errors: ${errors.join(', ')}` 
      };
    }
    
    return { success: true, deletedCount };
    
  } catch (error: any) {
    console.error('❌ Account cleanup failed:', error);
    logger.error('Account cleanup failed', { error: error.message });
    return { 
      success: false, 
      deletedCount: 0, 
      error: error.message || 'Cleanup failed' 
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