import {
  getOfflineExpenses,
  deleteOfflineExpense,
  updateSyncAttempt
} from './offlineDB';
import { callSecureApi } from './api';
import { toast } from 'sonner';

export const syncOfflineExpenses = async (): Promise<void> => {
  if (!navigator.onLine) return;

  try {
    const offlineExpenses = await getOfflineExpenses();
    if (offlineExpenses.length === 0) return;

    console.log(`Starting sync for ${offlineExpenses.length} offline expenses...`);
    let syncedCount = 0;

    for (const expense of offlineExpenses) {
      try {
        await callSecureApi('/api/add-expense', {
          groupId: expense.groupId,
          amount: expense.amount,
          paidBy: expense.paidBy,
          participants: expense.participants,
          note: expense.note,
          place: expense.place
        });

        // If successful, remove from offline DB
        await deleteOfflineExpense(expense.id);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync expense ${expense.id}:`, error);
        await updateSyncAttempt(expense.id);
      }
    }

    if (syncedCount > 0) {
      toast.success(`${syncedCount} offline expense(s) synced successfully`);
    }
  } catch (error) {
    console.error('Error during offline sync:', error);
  }
};
