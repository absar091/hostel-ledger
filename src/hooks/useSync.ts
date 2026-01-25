import { useState, useEffect, useCallback } from 'react';
import { getOfflineExpenses, deleteOfflineExpense, getOfflineExpenseCount } from '@/lib/offlineDB';
import { useFirebaseData } from '@/contexts/FirebaseDataContext';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const { addExpense } = useFirebaseData();
const { user } = useFirebaseAuth();
const [isSyncingState, setIsSyncingState] = useState(false);
const isSyncingRef = React.useRef(false); // Ref to track status without triggering re-renders/dependency changes
const [pendingCount, setPendingCount] = useState(0);
const [isOnline, setIsOnline] = useState(navigator.onLine);

// Update pending count
const updatePendingCount = useCallback(async () => {
    try {
        const count = await getOfflineExpenseCount();
        setPendingCount(count);
    } catch (error) {
        console.error('Failed to get pending count:', error);
    }
}, []);

// Sync function
const syncData = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine || !user) return;

    const expenses = await getOfflineExpenses();
    if (expenses.length === 0) {
        setPendingCount(0);
        return;
    }

    isSyncingRef.current = true;
    setIsSyncingState(true); // For UI updates only
    let successCount = 0;
    let failCount = 0;

    toast.info(`🔄 Syncing ${expenses.length} offline expenses...`, {
        id: 'sync-status',
        duration: Infinity
    });

    for (const expense of expenses) {
        try {
            const result = await addExpense({
                groupId: expense.groupId,
                amount: expense.amount,
                paidBy: expense.paidBy,
                participants: expense.participants,
                note: expense.note,
                place: expense.place,
            });

            if (result.success) {
                await deleteOfflineExpense(expense.id);
                successCount++;
            } else {
                failCount++;
                logger.error('Failed to sync offline expense', { expenseId: expense.id, error: result.error });
            }
        } catch (error: any) {
            failCount++;
            logger.error('Sync error', { expenseId: expense.id, error: error.message });
        }
    }

    isSyncingRef.current = false;
    setIsSyncingState(false);
    await updatePendingCount();

    if (successCount > 0) {
        toast.success(`✅ Successfully synced ${successCount} expenses!`, {
            id: 'sync-status'
        });
    } else if (failCount > 0) {
        toast.error(`❌ Failed to sync ${failCount} expenses. Will retry later.`, {
            id: 'sync-status'
        });
    } else {
        toast.dismiss('sync-status');
    }
}, [user, addExpense, updatePendingCount]);

// Monitor online status and AUTO-SYNC on startup
useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        syncData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check and AUTO-SYNC if online with pending items
    const initSync = async () => {
        await updatePendingCount();
        // Auto-sync on startup if online
        if (navigator.onLine && user) {
            setTimeout(() => syncData(), 1000); // Slight delay for auth to stabilize
        }
    };
    initSync();

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}, [syncData, updatePendingCount, user]);

return {
    isOnline,
    isSyncing,
    pendingCount,
    syncData,
    updatePendingCount
};
};
