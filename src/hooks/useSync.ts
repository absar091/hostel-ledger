import { useState, useEffect, useCallback, useRef } from 'react';
import { getOfflineExpenses, deleteOfflineExpense, getOfflineExpenseCount, updateOfflineExpense } from '@/lib/offlineDB';
import { useFirebaseData } from '@/contexts/FirebaseDataContext';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

let globalSyncInProgress = false;
let startupSyncedUserId: string | null = null;

export const useSync = () => {
    const { addExpense } = useFirebaseData();
    const { user } = useFirebaseAuth();
    const [isSyncingState, setIsSyncingState] = useState(false);
    const isSyncingRef = useRef(false); // local instance state
    const [pendingCount, setPendingCount] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const addExpenseRef = useRef(addExpense);

    useEffect(() => {
        addExpenseRef.current = addExpense;
    }, [addExpense]);

    const updatePendingCount = useCallback(async () => {
        try {
            const count = await getOfflineExpenseCount();
            setPendingCount(count);
        } catch (error) {
            console.error('Failed to get pending count:', error);
        }
    }, []);

    const syncData = useCallback(async () => {
        if (isSyncingRef.current || globalSyncInProgress || !navigator.onLine || !user) return;

        isSyncingRef.current = true;
        globalSyncInProgress = true;
        setIsSyncingState(true);

        try {
            const expenses = await getOfflineExpenses();
            if (expenses.length === 0) {
                setPendingCount(0);
                return;
            }

            let successCount = 0;
            let failCount = 0;

            toast.info(`🔄 Syncing ${expenses.length} offline expenses...`, {
                id: 'sync-status',
                duration: Infinity
            });

            const MAX_SYNC_ATTEMPTS = 5;

            for (const expense of expenses) {
                if ((expense.syncAttempts || 0) >= MAX_SYNC_ATTEMPTS) {
                    logger.warn('Skipping offline expense after max retries', { id: expense.id, attempts: expense.syncAttempts });
                    continue;
                }

                expense.syncAttempts = (expense.syncAttempts || 0) + 1;
                expense.lastSyncAttempt = Date.now();
                await updateOfflineExpense(expense);

                try {
                    const result = await addExpenseRef.current({
                        groupId: expense.groupId,
                        amount: expense.amount,
                        paidBy: expense.paidBy,
                        participants: expense.participants,
                        note: expense.note,
                        place: expense.place,
                        clientTxnId: expense.clientTxnId || expense.id,
                    });

                    if (result.success) {
                        await deleteOfflineExpense(expense.id);
                        successCount++;
                    } else {
                        failCount++;
                        logger.error('Failed to sync offline expense', { expenseId: expense.id, error: result.error });
                        break;
                    }
                } catch (error: any) {
                    failCount++;
                    logger.error('Sync error', { expenseId: expense.id, error: error.message });
                    break;
                }
            }

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
        } finally {
            isSyncingRef.current = false;
            globalSyncInProgress = false;
            setIsSyncingState(false);
        }
    }, [user, updatePendingCount]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncData();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const initSync = async () => {
            await updatePendingCount();

            if (navigator.onLine && user && startupSyncedUserId !== user.uid) {
                startupSyncedUserId = user.uid;
                setTimeout(() => syncData(), 1000);
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
        isSyncing: isSyncingState,
        pendingCount,
        syncData,
        updatePendingCount
    };
};
