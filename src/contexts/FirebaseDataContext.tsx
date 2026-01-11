import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ref, push, set, update, remove, onValue, off, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { useFirebaseAuth, PaymentDetails } from "./FirebaseAuthContext";

export interface GroupMember {
  id: string;
  name: string;
  isCurrentUser?: boolean;
  balance: number;
  paymentDetails?: PaymentDetails;
  phone?: string;
  userId?: string; // Firebase user ID for real users
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  members: GroupMember[];
  createdBy: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  groupId: string;
  type: "expense" | "payment" | "wallet_add" | "wallet_deduct";
  title: string;
  amount: number;
  date: string;
  paidBy: string;
  paidByName: string;
  participants?: { id: string; name: string; amount: number }[];
  from?: string;
  fromName?: string;
  to?: string;
  toName?: string;
  method?: "cash" | "online";
  place?: string;
  note?: string;
  walletBalanceAfter?: number;
  createdAt: string;
}

interface FirebaseDataContextType {
  groups: Group[];
  transactions: Transaction[];
  isLoading: boolean;
  createGroup: (data: { name: string; emoji: string; members: { name: string; paymentDetails?: PaymentDetails; phone?: string }[] }) => Promise<{ success: boolean; error?: string }>;
  updateGroup: (groupId: string, data: Partial<Group>) => Promise<{ success: boolean; error?: string }>;
  deleteGroup: (groupId: string) => Promise<{ success: boolean; error?: string }>;
  addMemberToGroup: (groupId: string, member: { name: string; paymentDetails?: PaymentDetails; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberPaymentDetails: (groupId: string, memberId: string, paymentDetails: PaymentDetails, phone?: string) => Promise<{ success: boolean; error?: string }>;
  addExpense: (data: { groupId: string; amount: number; paidBy: string; participants: string[]; note: string; place: string }) => Promise<{ success: boolean; error?: string }>;
  recordPayment: (data: { groupId: string; fromMember: string; toMember: string; amount: number; method: "cash" | "online"; note?: string }) => Promise<{ success: boolean; error?: string }>;
  markPaymentAsPaid: (groupId: string, toMember: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  addMoneyToWallet: (amount: number, note?: string) => Promise<{ success: boolean; error?: string }>;
  getGroupById: (groupId: string) => Group | undefined;
  getTransactionsByGroup: (groupId: string) => Transaction[];
  getTransactionsByMember: (groupId: string, memberId: string) => Transaction[];
  getAllTransactions: () => Transaction[];
}

const FirebaseDataContext = createContext<FirebaseDataContextType | undefined>(undefined);

export const FirebaseDataProvider = ({ children }: { children: ReactNode }) => {
  const { user, addMoneyToWallet: addToAuthWallet, deductMoneyFromWallet } = useFirebaseAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time listeners
  useEffect(() => {
    if (!user) {
      setGroups([]);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Listen to user's groups
    const groupsRef = ref(database, `userGroups/${user.uid}`);
    const groupsListener = onValue(groupsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const userGroupIds = Object.keys(snapshot.val());
        const groupPromises = userGroupIds.map(async (groupId) => {
          const groupRef = ref(database, `groups/${groupId}`);
          const groupSnapshot = await get(groupRef);
          return groupSnapshot.exists() ? { id: groupId, ...groupSnapshot.val() } : null;
        });
        
        const groupsData = await Promise.all(groupPromises);
        setGroups(groupsData.filter(Boolean) as Group[]);
      } else {
        setGroups([]);
      }
      setIsLoading(false);
    });

    // Listen to user's transactions
    const transactionsRef = ref(database, `userTransactions/${user.uid}`);
    const transactionsListener = onValue(transactionsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const userTransactionIds = Object.keys(snapshot.val());
        const transactionPromises = userTransactionIds.map(async (transactionId) => {
          const transactionRef = ref(database, `transactions/${transactionId}`);
          const transactionSnapshot = await get(transactionRef);
          return transactionSnapshot.exists() ? { id: transactionId, ...transactionSnapshot.val() } : null;
        });
        
        const transactionsData = await Promise.all(transactionPromises);
        const sortedTransactions = transactionsData
          .filter(Boolean)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(sortedTransactions as Transaction[]);
      } else {
        setTransactions([]);
      }
    });

    // Cleanup listeners
    return () => {
      off(groupsRef, 'value', groupsListener);
      off(transactionsRef, 'value', transactionsListener);
    };
  }, [user]);

  const createGroup = async (data: { 
    name: string; 
    emoji: string; 
    members: { name: string; paymentDetails?: PaymentDetails; phone?: string }[] 
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const groupsRef = ref(database, 'groups');
      const newGroupRef = push(groupsRef);
      const groupId = newGroupRef.key!;

      const newGroup: Group = {
        id: groupId,
        name: data.name,
        emoji: data.emoji,
        members: [
          {
            id: user.uid,
            name: "You",
            isCurrentUser: true,
            balance: 0,
            paymentDetails: user.paymentDetails,
            phone: user.phone,
            userId: user.uid,
          },
          ...data.members.map((m) => ({
            id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: m.name,
            balance: 0,
            paymentDetails: m.paymentDetails,
            phone: m.phone,
          })),
        ],
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      };

      await set(newGroupRef, newGroup);
      
      // Add group to user's groups
      const userGroupRef = ref(database, `userGroups/${user.uid}/${groupId}`);
      await set(userGroupRef, true);

      return { success: true };
    } catch (error: any) {
      console.error("Create group error:", error);
      return { success: false, error: error.message || "Failed to create group" };
    }
  };

  const addExpense = async (data: { 
    groupId: string; 
    amount: number; 
    paidBy: string; 
    participants: string[]; 
    note: string; 
    place: string 
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const group = groups.find((g) => g.id === data.groupId);
      if (!group) return { success: false, error: "Group not found" };

      // Validation
      if (data.amount <= 0) {
        return { success: false, error: "Expense amount must be positive" };
      }

      if (data.participants.length === 0) {
        return { success: false, error: "Must have at least one participant" };
      }

      const payer = group.members.find((m) => m.id === data.paidBy);
      const participantMembers = group.members.filter((m) => data.participants.includes(m.id));

      if (!payer) {
        return { success: false, error: "Invalid payer ID" };
      }

      // Check if current user is the payer and has sufficient wallet balance
      const isCurrentUserPayer = payer.isCurrentUser;
      if (isCurrentUserPayer) {
        const currentUserParticipantIndex = participantMembers.findIndex(p => p.isCurrentUser);
        const baseAmount = Math.floor(data.amount / participantMembers.length);
        const remainder = data.amount % participantMembers.length;
        const userShare = baseAmount + (currentUserParticipantIndex < remainder ? 1 : 0);
        
        const deductResult = await deductMoneyFromWallet(userShare);
        if (!deductResult.success) {
          return { success: false, error: deductResult.error || "Insufficient wallet balance" };
        }
      }

      // Calculate split amounts
      const baseAmount = Math.floor(data.amount / participantMembers.length);
      const remainder = data.amount % participantMembers.length;
      const splitAmounts = participantMembers.map((_, index) => 
        baseAmount + (index < remainder ? 1 : 0)
      );

      // Create transaction
      const transactionsRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionsRef);
      const transactionId = newTransactionRef.key!;

      const newTransaction: Transaction = {
        id: transactionId,
        groupId: data.groupId,
        type: "expense",
        title: data.note || "Expense",
        amount: data.amount,
        date: new Date().toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric",
          year: "numeric"
        }),
        paidBy: data.paidBy,
        paidByName: payer.name,
        participants: participantMembers.map((m, index) => ({
          id: m.id,
          name: m.name,
          amount: splitAmounts[index],
        })),
        place: data.place,
        note: data.note,
        walletBalanceAfter: isCurrentUserPayer ? user.walletBalance : undefined,
        createdAt: new Date().toISOString(),
      };

      await set(newTransactionRef, newTransaction);

      // Add transaction to all group members' transaction lists
      const memberPromises = group.members.map(async (member) => {
        if (member.userId) {
          const userTransactionRef = ref(database, `userTransactions/${member.userId}/${transactionId}`);
          await set(userTransactionRef, true);
        }
      });
      await Promise.all(memberPromises);

      // Update group member balances
      const updatedMembers = group.members.map((m) => {
        if (m.id === data.paidBy) {
          const payerParticipantIndex = participantMembers.findIndex(p => p.id === data.paidBy);
          const payerShare = payerParticipantIndex >= 0 ? splitAmounts[payerParticipantIndex] : 0;
          const othersTotal = data.amount - payerShare;
          return { ...m, balance: m.balance + othersTotal };
        } else if (data.participants.includes(m.id)) {
          const participantIndex = participantMembers.findIndex(p => p.id === m.id);
          const theirShare = splitAmounts[participantIndex];
          return { ...m, balance: m.balance - theirShare };
        }
        return m;
      });

      const groupRef = ref(database, `groups/${data.groupId}/members`);
      await set(groupRef, updatedMembers);

      return { success: true };
    } catch (error: any) {
      console.error("Add expense error:", error);
      return { success: false, error: error.message || "Failed to add expense" };
    }
  };

  const recordPayment = async (data: { 
    groupId: string; 
    fromMember: string; 
    toMember: string; 
    amount: number; 
    method: "cash" | "online"; 
    note?: string 
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const group = groups.find((g) => g.id === data.groupId);
      if (!group) return { success: false, error: "Group not found" };

      const fromPerson = group.members.find((m) => m.id === data.fromMember);
      const toPerson = group.members.find((m) => m.id === data.toMember);

      if (!fromPerson || !toPerson) {
        return { success: false, error: "Invalid member IDs" };
      }

      // Create transaction
      const transactionsRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionsRef);
      const transactionId = newTransactionRef.key!;

      const newTransaction: Transaction = {
        id: transactionId,
        groupId: data.groupId,
        type: "payment",
        title: "Payment",
        amount: data.amount,
        date: new Date().toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric",
          year: "numeric"
        }),
        paidBy: data.fromMember,
        paidByName: fromPerson.name,
        from: data.fromMember,
        fromName: fromPerson.name,
        to: data.toMember,
        toName: toPerson.name,
        method: data.method,
        note: data.note,
        createdAt: new Date().toISOString(),
      };

      await set(newTransactionRef, newTransaction);

      // Add transaction to relevant members' transaction lists
      const memberPromises = group.members
        .filter(member => member.userId && (member.id === data.fromMember || member.id === data.toMember))
        .map(async (member) => {
          const userTransactionRef = ref(database, `userTransactions/${member.userId}/${transactionId}`);
          await set(userTransactionRef, true);
        });
      await Promise.all(memberPromises);

      // Update balances
      const updatedMembers = group.members.map((m) => {
        if (m.id === data.fromMember) {
          return { ...m, balance: m.balance - data.amount };
        } else if (m.id === data.toMember) {
          return { ...m, balance: m.balance + data.amount };
        }
        return m;
      });

      const groupRef = ref(database, `groups/${data.groupId}/members`);
      await set(groupRef, updatedMembers);

      return { success: true };
    } catch (error: any) {
      console.error("Record payment error:", error);
      return { success: false, error: error.message || "Failed to record payment" };
    }
  };

  const markPaymentAsPaid = async (groupId: string, toMember: string, amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    const deductResult = await deductMoneyFromWallet(amount);
    if (!deductResult.success) {
      return { success: false, error: deductResult.error || "Failed to deduct from wallet" };
    }

    return await recordPayment({
      groupId,
      fromMember: user.uid,
      toMember,
      amount,
      method: "online",
      note: "Paid from wallet"
    });
  };

  const addMoneyToWallet = async (amount: number, note?: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || amount <= 0) return { success: false, error: "Invalid amount or user not authenticated" };

    try {
      const addResult = await addToAuthWallet(amount);
      if (!addResult.success) {
        return addResult;
      }

      // Create wallet transaction record
      const transactionsRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionsRef);
      const transactionId = newTransactionRef.key!;

      const walletTransaction: Transaction = {
        id: transactionId,
        groupId: "wallet",
        type: "wallet_add",
        title: "Money Added to Wallet",
        amount: amount,
        date: new Date().toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric",
          year: "numeric"
        }),
        paidBy: user.uid,
        paidByName: user.name,
        note: note || "Added money to wallet",
        walletBalanceAfter: user.walletBalance + amount,
        createdAt: new Date().toISOString(),
      };

      await set(newTransactionRef, walletTransaction);

      // Add to user's transactions
      const userTransactionRef = ref(database, `userTransactions/${user.uid}/${transactionId}`);
      await set(userTransactionRef, true);

      return { success: true };
    } catch (error: any) {
      console.error("Add money to wallet error:", error);
      return { success: false, error: error.message || "Failed to add money to wallet" };
    }
  };

  // Placeholder implementations for other methods
  const updateGroup = async (groupId: string, data: Partial<Group>): Promise<{ success: boolean; error?: string }> => {
    try {
      const groupRef = ref(database, `groups/${groupId}`);
      await update(groupRef, data);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const deleteGroup = async (groupId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const groupRef = ref(database, `groups/${groupId}`);
      await remove(groupRef);
      
      // Remove from user's groups
      const userGroupRef = ref(database, `userGroups/${user?.uid}/${groupId}`);
      await remove(userGroupRef);
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const addMemberToGroup = async (groupId: string, member: { name: string; paymentDetails?: PaymentDetails; phone?: string }): Promise<{ success: boolean; error?: string }> => {
    // Implementation would go here
    return { success: false, error: "Not implemented" };
  };

  const removeMemberFromGroup = async (groupId: string, memberId: string): Promise<{ success: boolean; error?: string }> => {
    // Implementation would go here
    return { success: false, error: "Not implemented" };
  };

  const updateMemberPaymentDetails = async (groupId: string, memberId: string, paymentDetails: PaymentDetails, phone?: string): Promise<{ success: boolean; error?: string }> => {
    // Implementation would go here
    return { success: false, error: "Not implemented" };
  };

  // Helper functions
  const getGroupById = (groupId: string): Group | undefined => {
    return groups.find((g) => g.id === groupId);
  };

  const getTransactionsByGroup = (groupId: string): Transaction[] => {
    return transactions.filter((t) => t.groupId === groupId);
  };

  const getTransactionsByMember = (groupId: string, memberId: string): Transaction[] => {
    return transactions.filter((t) => {
      if (t.groupId !== groupId) return false;
      
      if (t.type === "expense") {
        return t.paidBy === memberId || t.participants?.some((p) => p.id === memberId);
      } else {
        return t.from === memberId || t.to === memberId;
      }
    });
  };

  const getAllTransactions = (): Transaction[] => {
    return transactions;
  };

  return (
    <FirebaseDataContext.Provider
      value={{
        groups,
        transactions,
        isLoading,
        createGroup,
        updateGroup,
        deleteGroup,
        addMemberToGroup,
        removeMemberFromGroup,
        updateMemberPaymentDetails,
        addExpense,
        recordPayment,
        markPaymentAsPaid,
        addMoneyToWallet,
        getGroupById,
        getTransactionsByGroup,
        getTransactionsByMember,
        getAllTransactions,
      }}
    >
      {children}
    </FirebaseDataContext.Provider>
  );
};

export const useFirebaseData = () => {
  const context = useContext(FirebaseDataContext);
  if (context === undefined) {
    throw new Error("useFirebaseData must be used within a FirebaseDataProvider");
  }
  return context;
};