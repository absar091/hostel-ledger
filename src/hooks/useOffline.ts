import { useState, useEffect, useCallback } from "react";
import { setupOnlineListeners, isOnline, syncOfflineExpenses } from "@/lib/offlineSync";
import { getOfflineExpenseCount } from "@/lib/offlineDB";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export const useOffline = () => {
  const [offline, setOffline] = useState(!isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { addExpense } = useFirebaseData();

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getOfflineExpenseCount();
      setPendingCount(count);
    } catch (error) {
      logger.error("Failed to get offline expense count", { error });
    }
  }, []);

  // Sync offline expenses
  const syncNow = useCallback(async () => {
    if (offline || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await syncOfflineExpenses(addExpense);
      
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} offline expense${result.synced > 1 ? 's' : ''}`);
      }
      
      if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} expense${result.failed > 1 ? 's' : ''}`);
      }

      await updatePendingCount();
    } catch (error: any) {
      logger.error("Sync failed", { error: error.message });
      toast.error("Failed to sync offline expenses");
    } finally {
      setIsSyncing(false);
    }
  }, [offline, isSyncing, addExpense, updatePendingCount]);

  // Handle online event
  const handleOnline = useCallback(() => {
    setOffline(false);
    toast.success("Back online! Syncing...");
    // Auto-sync when coming back online
    setTimeout(() => syncNow(), 1000);
  }, [syncNow]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setOffline(true);
    toast.info("You're offline. Add Expense will save locally.");
  }, []);

  // Setup listeners
  useEffect(() => {
    const cleanup = setupOnlineListeners(handleOnline, handleOffline);
    updatePendingCount();
    
    return cleanup;
  }, [handleOnline, handleOffline, updatePendingCount]);

  // Auto-sync on mount if online
  useEffect(() => {
    if (!offline && pendingCount > 0) {
      syncNow();
    }
  }, []); // Only run once on mount

  return {
    offline,
    pendingCount,
    isSyncing,
    syncNow,
    updatePendingCount,
  };
};
