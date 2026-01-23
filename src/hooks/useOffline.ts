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
    logger.info("Connection restored, auto-syncing...");
    toast.success("Back online! Syncing...", { duration: 2000 });
    // Auto-sync immediately when coming back online
    setTimeout(() => syncNow(), 500);
  }, [syncNow]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setOffline(true);
    logger.info("Connection lost, offline mode enabled");
    toast.info("You're offline. Changes will sync when online.", { duration: 3000 });
  }, []);

  // Setup listeners
  useEffect(() => {
    const cleanup = setupOnlineListeners(handleOnline, handleOffline);
    updatePendingCount();
    
    return cleanup;
  }, [handleOnline, handleOffline, updatePendingCount]);

  // Auto-sync on mount if online and has pending items
  useEffect(() => {
    if (!offline && pendingCount > 0 && !isSyncing) {
      logger.info("Auto-syncing pending items on mount", { pendingCount });
      syncNow();
    }
  }, [offline, pendingCount]); // Run when offline status or pending count changes

  // Periodic background sync every 30 seconds if online and has pending items
  useEffect(() => {
    if (offline || pendingCount === 0) return;

    const intervalId = setInterval(() => {
      if (!offline && pendingCount > 0 && !isSyncing) {
        logger.info("Periodic background sync triggered", { pendingCount });
        syncNow();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [offline, pendingCount, isSyncing, syncNow]);

  return {
    offline,
    pendingCount,
    isSyncing,
    syncNow,
    updatePendingCount,
  };
};
