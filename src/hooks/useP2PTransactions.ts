
import { useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { database } from '@/lib/firebase';
import { ref, onValue, DataSnapshot } from 'firebase/database';
import { sendMoney as apiSendMoney, respondToMoneyRequest as apiRespond } from '@/lib/api';
import { toast } from 'sonner';

export interface P2PTransaction {
    id: string;
    from: string;
    to: string;
    amount: number;
    status: 'pending' | 'completed' | 'rejected';
    note?: string;
    type: 'p2p_transfer';
    senderName: string;
    senderUsername: string;
    receiverName: string;
    receiverUsername: string;
    createdAt: string;
    timestamp: number;
    completedAt?: string;
    rejectedAt?: string;
}

export const useP2PTransactions = () => {
    const { user } = useFirebaseAuth();
    const [transactions, setTransactions] = useState<P2PTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setTransactions([]);
            setLoading(false);
            return;
        }

        const txRef = ref(database, `user_p2p_transactions/${user.uid}`);

        const handleData = (snapshot: DataSnapshot) => {
            if (!snapshot.exists()) {
                setTransactions([]);
                setLoading(false);
                return;
            }

            const data = snapshot.val();
            const txList: P2PTransaction[] = Object.values(data);

            // Sort by timestamp desc
            txList.sort((a, b) => b.timestamp - a.timestamp);

            setTransactions(txList);
            setLoading(false);
        };

        const unsubscribe = onValue(txRef, handleData, (error) => {
            console.error("P2P Listener Error:", error);
            // Don't set loading to false here to allow retry or keep stale data? 
            // Better to stop loading so UI doesn't freeze.
            setLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, [user]);

    const sendMoney = async (recipientUsername: string, amount: number, note?: string) => {
        try {
            const result = await apiSendMoney(recipientUsername, amount, note);
            if (result.success) {
                toast.success("Money request sent!");
                return { success: true, transactionId: result.transactionId };
            }
            toast.error(result.error || "Failed to send money");
            return { success: false, error: result.error };
        } catch (e: any) {
            toast.error(e.message || "Failed to send money");
            return { success: false, error: e.message };
        }
    };

    const respondToRequest = async (transactionId: string, accept: boolean) => {
        try {
            const result = await apiRespond(transactionId, accept);
            if (result.success) {
                toast.success(accept ? "Payment accepted!" : "Request rejected");
                return { success: true };
            }
            toast.error(result.error || "Action failed");
            return { success: false, error: result.error };
        } catch (e: any) {
            toast.error(e.message || "Action failed");
            return { success: false, error: e.message };
        }
    };

    // Derived Stats
    const lentAmount = transactions
        .filter(t => t.from === user?.uid && t.status === 'pending') // Only count pending as "Lent" (waiting for clear)? 
        // Actually, "Lent" usually means "I gave money, they owe me". 
        // But here "Send Money" moves money from Wallet A to Wallet B. 
        // It's a Transfer, not a Loan.
        // However, the user asked for "Loans".
        // If it's a Transfer:
        //  - Pending: Money hasn't moved.
        //  - Completed: Money moved.

        // If we want to track "Debts", we need a different status or type?
        // For now, let's just track "Pending Requests" (Incoming) and "Sent Requests" (Outgoing).

        // Incoming Pending (Action needed)
        .filter(t => t.to === user?.uid && t.status === 'pending');

    const pendingIncoming = transactions.filter(t => t.to === user?.uid && t.status === 'pending');
    const pendingOutgoing = transactions.filter(t => t.from === user?.uid && t.status === 'pending');

    const completedHistory = transactions.filter(t => t.status === 'completed');

    return {
        transactions,
        loading,
        sendMoney,
        respondToRequest,
        pendingIncoming,
        pendingOutgoing,
        completedHistory
    };
};
