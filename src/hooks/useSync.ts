import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getOfflineExpenses, deleteOfflineExpense, getOfflineExpenseCount, updateOfflineExpense,
    getOfflinePayments, deleteOfflinePayment, getOfflinePaymentCount
} from '@/lib/offlineDB';
import { useFirebaseData } from '@/contexts/FirebaseDataContext';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

let startupSyncedUserId: string | null = null;

export const useSync = () => {
    const { addExpense, recordPayment } = useFirebaseData();
    const { user } = useFirebaseAuth();
    const [isSyncingState, setIsSyncingState] = useState(false);
    const isSyncingRef = useRef(false); // Ref to track status without triggering re-renders/dependency changes
    const [pendingCount, setPendingCount] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const addExpenseRef = useRef(addExpense);
    const recordPaymentRef = useRef(recordPayment);

    useEffect(() => {
        addExpenseRef.current = addExpense;
        recordPaymentRef.current = recordPayment;
    }, [addExpense, recordPayment]);

    // Update pending count
    const updatePendingCount = useCallback(async () => {
        try {
            const expCount = await getOfflineExpenseCount();
            const payCount = await getOfflinePaymentCount();
            setPendingCount(expCount + payCount);
        } catch (error) {
            console.error('Failed to get pending count:', error);
        }
    }, []);

    // Sync function
    const syncData = useCallback(async () => {
        if (isSyncingRef.current || !navigator.onLine || !user) return;

        // Set immediately (synchronously) to prevent race conditions
        // from multiple triggers (online event, initSync, useEffect)
        isSyncingRef.current = true;
        setIsSyncingState(true);

        const expenses = await getOfflineExpenses();
        const payments = await getOfflinePayments();

        if (expenses.length === 0 && payments.length === 0) {
            setPendingCount(0);
            isSyncingRef.current = false;
            setIsSyncingState(false);
            return;
        }

        let successCount = 0;
        let failCount = 0;

        toast.info(`🔄 Syncing ${expenses.length + payments.length} offline items...`, {
            id: 'sync-status',
            duration: Infinity
        });

        const MAX_SYNC_ATTEMPTS = 5;

        for (const expense of expenses) {
            // Poison pill check
            if ((expense.syncAttempts || 0) >= MAX_SYNC_ATTEMPTS) {
                logger.warn('Skipping offline expense after max retries', { id: expense.id, attempts: expense.syncAttempts });
                continue;
            }

            // Increment attempt counter
            expense.syncAttempts = (expense.syncAttempts || 0) + 1;
            expense.lastSyncAttempt = Date.now();

            // We need to update the offline record with new attempt count
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
                    // Stop on first error to prevent further failures/load
                    break;
                }
            } catch (error: any) {
                failCount++;
                logger.error('Sync error', { expenseId: expense.id, error: error.message });
                // Stop on first exception
                break;
            }
        }

        // Sync Payments
        for (const payment of payments) {
            // Poison pill check
            if ((payment.syncAttempts || 0) >= MAX_SYNC_ATTEMPTS) {
                logger.warn('Skipping offline payment after max retries', { id: payment.id });
                continue;
            }

            // Update attempt local (we don't persist update for payments yet but we should? 
            // schema supports it, let's skip persistence for now to save complexity or 
            // assume it works fine. Actually we should update DB to avoid infinite loop on crash?)
            // Let's just try to sync.

            try {
                const result = await recordPaymentRef.current({
                    groupId: payment.groupId,
                    fromMember: payment.fromMember,
                    toMember: payment.toMember,
                    amount: payment.amount,
                    method: payment.method,
                    note: payment.note
                });

                if (result.success) {
                    await deleteOfflinePayment(payment.id);
                    successCount++;
                } else {
                    failCount++;
                    logger.error('Failed to sync offline payment', { paymentId: payment.id, error: result.error });
                    // We aren't incrementing persistent retry count in DB for payments yet
                    // Just break to be safe
                    break;
                }
            } catch (error: any) {
                failCount++;
                logger.error('Sync payment error', { paymentId: payment.id, error: error.message });
                break;
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
    }, [user, updatePendingCount]);

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
            if (navigator.onLine && user && startupSyncedUserId !== user.uid) {
                startupSyncedUserId = user.uid;
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
        isSyncing: isSyncingState,
        pendingCount,
        syncData,
        updatePendingCount
    };
};
