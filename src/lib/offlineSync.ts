import { 
  getOfflineExpenses, 
  deleteOfflineExpense, 
  updateSyncAttempt,
  OfflineExpense 
} from "./offlineDB";
import { logger } from "./logger";

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

// Maximum sync attempts before giving up
const MAX_SYNC_ATTEMPTS = 3;

// Sync offline expenses to Firebase
export const syncOfflineExpenses = async (
  addExpenseFunction: (data: {
    groupId: string;
    amount: number;
    paidBy: string;
    participants: string[];
    note: string;
    place: string;
  }) => Promise<{ success: boolean; error?: string }>
): Promise<SyncResult> => {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    const offlineExpenses = await getOfflineExpenses();
    
    if (offlineExpenses.length === 0) {
      logger.info("No offline expenses to sync");
      return result;
    }

    logger.info(`Starting sync of ${offlineExpenses.length} offline expenses`);

    for (const expense of offlineExpenses) {
      // Skip if max attempts reached
      if ((expense.syncAttempts || 0) >= MAX_SYNC_ATTEMPTS) {
        logger.warn(`Skipping expense ${expense.id} - max sync attempts reached`);
        result.failed++;
        result.errors.push(`Expense from ${new Date(expense.timestamp).toLocaleDateString()} failed after ${MAX_SYNC_ATTEMPTS} attempts`);
        continue;
      }

      try {
        // Attempt to sync
        const syncResult = await addExpenseFunction({
          groupId: expense.groupId,
          amount: expense.amount,
          paidBy: expense.paidBy,
          participants: expense.participants,
          note: expense.note,
          place: expense.place,
        });

        if (syncResult.success) {
          // Successfully synced - delete from offline storage
          await deleteOfflineExpense(expense.id);
          result.synced++;
          logger.info(`Successfully synced offline expense ${expense.id}`);
        } else {
          // Sync failed - update attempt count
          await updateSyncAttempt(expense.id);
          result.failed++;
          result.errors.push(syncResult.error || "Unknown error");
          logger.error(`Failed to sync expense ${expense.id}`, { error: syncResult.error });
        }
      } catch (error: any) {
        // Network or other error - update attempt count
        await updateSyncAttempt(expense.id);
        result.failed++;
        result.errors.push(error.message || "Network error");
        logger.error(`Exception while syncing expense ${expense.id}`, { error: error.message });
      }
    }

    result.success = result.failed === 0;
    logger.info(`Sync completed: ${result.synced} synced, ${result.failed} failed`);
    
    return result;
  } catch (error: any) {
    logger.error("Sync process failed", { error: error.message });
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: [error.message || "Sync process failed"],
    };
  }
};

// Check if device is online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Setup online/offline event listeners
export const setupOnlineListeners = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
};
