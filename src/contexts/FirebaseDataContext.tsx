import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ref, push, set, update, remove, onValue, off, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { useFirebaseAuth, PaymentDetails } from "./FirebaseAuthContext";
import { TransactionManager, retryOperation } from "@/lib/transaction";

// Utility functions - defined locally to avoid import issues
const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>\"'&]/g, '').substring(0, 200);
};

const sanitizeAmount = (amount: string | number): number => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(num) ? 0 : Math.max(0, Math.min(num, 1000000));
};

const validateAmount = (amount: number): { isValid: boolean; error?: string } => {
  if (isNaN(amount) || amount <= 0) {
    return { isValid: false, error: 'Amount must be a positive number' };
  }
  if (amount > 1000000) {
    return { isValid: false, error: 'Amount cannot exceed 1,000,000' };
  }
  return { isValid: true };
};

const validateExpenseData = (data: {
  groupId: string;
  amount: number;
  paidBy: string;
  participants: string[];
  note: string;
  place: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.groupId || data.groupId.trim() === '') {
    errors.push('Group is required');
  }

  const amountValidation = validateAmount(data.amount);
  if (!amountValidation.isValid) {
    errors.push(amountValidation.error || 'Invalid amount');
  }

  if (!data.paidBy || data.paidBy.trim() === '') {
    errors.push('Please select who paid');
  }

  if (!data.participants || data.participants.length === 0) {
    errors.push('Please select at least one participant');
  }

  if (data.note && data.note.length > 200) {
    errors.push('Note must be less than 200 characters');
  }

  if (data.place && data.place.length > 100) {
    errors.push('Place must be less than 100 characters');
  }

  return { isValid: errors.length === 0, errors };
};

const validatePaymentData = (data: {
  groupId: string;
  fromMember: string;
  amount: number;
  method: string;
  note?: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.groupId || data.groupId.trim() === '') {
    errors.push('Group is required');
  }

  if (!data.fromMember || data.fromMember.trim() === '') {
    errors.push('Please select who paid you');
  }

  const amountValidation = validateAmount(data.amount);
  if (!amountValidation.isValid) {
    errors.push(amountValidation.error || 'Invalid amount');
  }

  if (!data.method || !['cash', 'online'].includes(data.method)) {
    errors.push('Please select a payment method');
  }

  if (data.note && data.note.length > 200) {
    errors.push('Note must be less than 200 characters');
  }

  return { isValid: errors.length === 0, errors };
};
import {
  calculateExpenseSplit,
  calculateExpenseSettlements,
  validateSettlementConsistency,
  calculateWalletBalanceAfter,
  validatePaymentAmount
} from "@/lib/expenseLogic";
import { logger } from "@/lib/logger";
import { sendTransactionNotifications, TransactionData, UserData } from "@/lib/transactionNotifications";

export interface GroupMember {
  id: string;
  name: string;
  isCurrentUser?: boolean;
  paymentDetails?: PaymentDetails;
  phone?: string | null;
  userId?: string; // Firebase user ID for real users
  balance?: number; // Calculated balance - optional since computed dynamically
  isTemporary?: boolean;
  tempId?: string;
  deletionCondition?: 'SETTLED' | 'TIME_LIMIT' | null;
  expiresAt?: number | null;
  deletionNotified?: boolean;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  coverPhoto?: string;
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
  participants?: { id: string; name: string; amount: number; isTemporary?: boolean }[];
  from?: string;
  fromName?: string;
  to?: string;
  toName?: string;
  method?: "cash" | "online";
  place?: string;
  note?: string;
  walletBalanceBefore?: number;
  walletBalanceAfter?: number;
  paidByIsTemporary?: boolean;
  fromIsTemporary?: boolean;
  toIsTemporary?: boolean;
  createdAt: string;
  timestamp?: number;
}

interface FirebaseDataContextType {
  groups: Group[];
  transactions: Transaction[];
  isLoading: boolean;
  createGroup: (data: { name: string; emoji: string; members: { name: string; paymentDetails?: PaymentDetails; phone?: string }[]; coverPhoto?: string }) => Promise<{ success: boolean; error?: string }>;
  updateGroup: (groupId: string, data: Partial<Group>) => Promise<{ success: boolean; error?: string }>;
  deleteGroup: (groupId: string) => Promise<{ success: boolean; error?: string }>;
  addMemberToGroup: (groupId: string, member: { id?: string; name: string; paymentDetails?: PaymentDetails; phone?: string; isTemporary?: boolean; deletionCondition?: 'SETTLED' | 'TIME_LIMIT' | null }) => Promise<{ success: boolean; error?: string; memberId?: string }>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberPaymentDetails: (groupId: string, memberId: string, paymentDetails: PaymentDetails, phone?: string) => Promise<{ success: boolean; error?: string }>;
  addExpense: (data: { groupId: string; amount: number; paidBy: string; participants: string[]; note: string; place: string }) => Promise<{ success: boolean; error?: string; transaction?: Transaction }>;
  recordPayment: (data: { groupId: string; fromMember: string; toMember: string; amount: number; method: "cash" | "online"; note?: string }) => Promise<{ success: boolean; error?: string; transaction?: Transaction }>;
  payMyDebt: (groupId: string, toMember: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  markPaymentAsPaid: (groupId: string, fromMember: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  addMoneyToWallet: (amount: number, note?: string) => Promise<{ success: boolean; error?: string }>;
  getGroupById: (groupId: string) => Group | undefined;
  getTransactionsByGroup: (groupId: string) => Transaction[];
  getTransactionsByMember: (groupId: string, memberId: string) => Transaction[];
  getAllTransactions: () => Transaction[];
}

const FirebaseDataContext = createContext<FirebaseDataContextType | undefined>(undefined);

export const FirebaseDataProvider = ({ children }: { children: ReactNode }) => {
  const {
    user,
    addMoneyToWallet: addToAuthWallet,
    deductMoneyFromWallet,
    addToReceivable,
    addToPayable,
    markPaymentReceived,
    markDebtPaid,
    getSettlements,
    updateSettlement
  } = useFirebaseAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time listeners with error handling
  useEffect(() => {
    if (!user) {
      setGroups([]);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Add a small delay to ensure Firebase auth is fully established
    const setupListeners = async () => {
      try {
        // Wait a bit for auth to be fully established
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Listen to user's groups with error handling
        const groupsRef = ref(database, `userGroups/${user.uid}`);
        const groupsListener = onValue(groupsRef, async (snapshot) => {
          try {
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
          } catch (error: any) {
            logger.error("Error loading groups", { uid: user.uid, error: error.message });
            setGroups([]);
          } finally {
            setIsLoading(false);
          }
        }, (error) => {
          logger.error("Groups listener error", { uid: user.uid, error: error.message });
          setIsLoading(false);
          // Don't throw error, just log it and continue
        });

        // Listen to user's transactions with error handling
        const transactionsRef = ref(database, `userTransactions/${user.uid}`);
        const transactionsListener = onValue(transactionsRef, async (snapshot) => {
          try {
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
          } catch (error: any) {
            logger.error("Error loading transactions", { uid: user.uid, error: error.message });
            setTransactions([]);
          }
        }, (error) => {
          logger.error("Transactions listener error", { uid: user.uid, error: error.message });
          // Don't throw error, just log it and continue
        });

        // Cleanup listeners
        return () => {
          off(groupsRef, 'value', groupsListener);
          off(transactionsRef, 'value', transactionsListener);
        };
      } catch (error: any) {
        logger.error("Error setting up Firebase listeners", { uid: user.uid, error: error.message });
        setIsLoading(false);
      }
    };

    const cleanup = setupListeners();






    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [user]);

  // Separate effect for checking expired members to avoid stale closures
  useEffect(() => {
    if (!user || groups.length === 0) return;

    const checkExpiredMembers = async () => {
      const now = Date.now();

      for (const group of groups) {
        const settlements = getSettlements(group.id);

        const expiredMembers = group.members.filter(m => {
          if (!m.isTemporary) return false;

          const memberSettlement = settlements[m.id] || { toReceive: 0, toPay: 0 };
          const hasDebt = memberSettlement.toReceive > 0 || memberSettlement.toPay > 0;

          if (m.deletionCondition === 'SETTLED') {
            return !hasDebt;
          }

          if (m.deletionCondition === 'TIME_LIMIT') {
            return !hasDebt && m.expiresAt && m.expiresAt < now;
          }

          return false;
        });

        if (expiredMembers.length > 0) {
          for (const member of expiredMembers) {
            logger.info("Removing expired temporary member", { memberName: member.name, groupName: group.name, groupId: group.id });
            try {
              const settlements = getSettlements(group.id);
              const memberSettlement = settlements[member.id] || { toReceive: 0, toPay: 0 };
              const hasDebt = memberSettlement && (memberSettlement.toReceive > 0 || memberSettlement.toPay > 0);

              if (!hasDebt) {
                const updatedMembers = group.members.filter(m => m.id !== member.id);
                const groupRef = ref(database, `groups/${group.id}/members`);
                await set(groupRef, updatedMembers);

                // Send email notification about deletion
                if (user.email) {
                  try {
                    await fetch('/api/send-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        to: user.email,
                        subject: `Temporary Member Removed: ${member.name}`,
                        html: `
                          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                            <h2 style="color: #4a6850;">Temporary Member Removed</h2>
                            <p>The temporary member <b>${member.name}</b> in group <b>${group.name}</b> has reached their time limit.</p>
                            <p>Since all debts were settled, they have been automatically removed from the group.</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="color: #666; font-size: 12px;">This is an automated message from Hostel Ledger.</p>
                          </div>
                        `
                      })
                    });
                    logger.info("Sent removal email", { memberName: member.name, email: user.email });
                  } catch (mailError: any) {
                    logger.error("Failed to send removal email", { memberName: member.name, error: mailError.message });
                  }
                }
              }
            } catch (e) {
              console.error("Failed to auto-remove member", e);
            }
          }
        }
      }
    };

    const intervalId = setInterval(checkExpiredMembers, 60000); // Check every minute
    checkExpiredMembers(); // Run immediately

    return () => clearInterval(intervalId);
  }, [user, groups]); // Re-run when groups change

  const createGroup = async (data: {
    name: string;
    emoji: string;
    members: { name: string; paymentDetails?: PaymentDetails; phone?: string }[];
    coverPhoto?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    // Validate input - basic validation for now
    if (!data.name || data.name.trim() === '') {
      return { success: false, error: "Group name is required" };
    }
    if (data.name.length > 50) {
      return { success: false, error: "Group name must be less than 50 characters" };
    }
    if (!data.emoji || data.emoji.trim() === '') {
      return { success: false, error: "Please select an emoji for the group" };
    }
    if (!data.members || data.members.length === 0) {
      return { success: false, error: "Please add at least one member" };
    }

    const transaction = new TransactionManager();

    try {
      const groupsRef = ref(database, 'groups');
      const newGroupRef = push(groupsRef);
      const groupId = newGroupRef.key!;

      const sanitizedMembers = data.members.map(m => ({
        name: m.name.trim().substring(0, 50),
        paymentDetails: m.paymentDetails || {},
        phone: m.phone ? m.phone.trim().substring(0, 20) : null,
      }));

      const newGroup: Group = {
        id: groupId,
        name: data.name.trim().substring(0, 50),
        emoji: data.emoji.trim().substring(0, 10),
        coverPhoto: data.coverPhoto || undefined,
        members: [
          {
            id: user.uid,
            name: "You",
            isCurrentUser: true,
            paymentDetails: user.paymentDetails || {},
            phone: user.phone || null,
            userId: user.uid,
          },
          ...sanitizedMembers.map((m) => ({
            id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            name: m.name,
            paymentDetails: m.paymentDetails,
            phone: m.phone,
          })),
        ],
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      };

      // Add operations to transaction
      transaction.addOperation({
        execute: async () => {
          await retryOperation(() => set(newGroupRef, newGroup));
          return newGroup;
        },
        rollback: async () => {
          await retryOperation(() => remove(newGroupRef));
        },
        description: "Create group"
      });

      transaction.addOperation({
        execute: async () => {
          const userGroupRef = ref(database, `userGroups/${user.uid}/${groupId}`);
          await retryOperation(() => set(userGroupRef, true));
          return true;
        },
        rollback: async () => {
          const userGroupRef = ref(database, `userGroups/${user.uid}/${groupId}`);
          await retryOperation(() => remove(userGroupRef));
        },
        description: "Add group to user's groups"
      });

      const result = await transaction.execute();
      return { success: result.success, error: result.error };
    } catch (error: any) {
      console.error("Create group error:", error);
      return { success: false, error: error.message || "Failed to create group" };
    }
  };

  const addMemberToGroup = async (groupId: string, member: { id?: string; name: string; paymentDetails?: PaymentDetails; phone?: string; isTemporary?: boolean; deletionCondition?: 'SETTLED' | 'TIME_LIMIT' | null }): Promise<{ success: boolean; error?: string; memberId?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return { success: false, error: "Group not found" };

      // Validate member data
      if (!member.name || member.name.trim() === '') {
        return { success: false, error: "Member name is required" };
      }

      if (member.name.length > 50) {
        return { success: false, error: "Member name cannot exceed 50 characters" };
      }

      // Check for duplicate names
      const existingNames = group.members.map(m => m.name.toLowerCase());
      if (existingNames.includes(member.name.toLowerCase())) {
        return { success: false, error: "A member with this name already exists" };
      }

      const newMember: GroupMember = {
        id: member.id || `member_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name: sanitizeString(member.name),
        paymentDetails: member.paymentDetails || {},
        phone: member.phone ? sanitizeString(member.phone) : null,
        // Ensure isTemporary is true if deletionCondition is set
        isTemporary: member.isTemporary || !!member.deletionCondition || false,
        deletionCondition: member.deletionCondition || null,
        expiresAt: member.deletionCondition === 'TIME_LIMIT' ? Date.now() + (7 * 24 * 60 * 60 * 1000) : null, // 1 week default
      };

      if (member.isTemporary && member.deletionCondition === 'TIME_LIMIT' && user.email) {
        // Send email notification about auto-deletion
        try {
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: user.email,
              subject: `Temporary Member Alert: ${newMember.name}`,
              html: `
                 <div style="font-family: sans-serif; padding: 20px;">
                   <h2>Temporary Member Added</h2>
                   <p>You added <b>${newMember.name}</b> as a temporary member to group <b>${group.name}</b>.</p>
                   <p>This member is scheduled to be automatically removed on <b>${new Date(newMember.expiresAt!).toLocaleDateString()}</b>.</p>
                   <p>Please ensure all debts are settled before this date.</p>
                 </div>
               `
            })
          });

          if (!response.ok) console.warn("Failed to send temp member notification");
        } catch (e) {
          console.error("Error sending email", e);
        }
      }

      const updatedMembers = [...group.members, newMember];
      const groupRef = ref(database, `groups/${groupId}/members`);

      // Optimistic local update to ensure validation passes immediately
      setGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return { ...g, members: updatedMembers };
        }
        return g;
      }));

      await retryOperation(() => set(groupRef, updatedMembers));

      return { success: true };
    } catch (error: any) {
      console.error("Add member error:", error);
      return { success: false, error: error.message || "Failed to add member" };
    }
  };

  const removeMemberFromGroup = async (groupId: string, memberId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return { success: false, error: "Group not found" };

      // Don't allow removing the current user
      if (memberId === user.uid) {
        return { success: false, error: "Cannot remove yourself from the group" };
      }

      const memberToRemove = group.members.find(m => m.id === memberId);
      if (!memberToRemove) {
        return { success: false, error: "Member not found" };
      }

      // Check if member has pending settlements in any group
      const settlements = getSettlements();
      let hasPendingSettlements = false;

      // Check all groups for this member
      Object.values(settlements).forEach((groupSettlements: any) => {
        const memberSettlement = groupSettlements[memberId];
        if (memberSettlement && (memberSettlement.toReceive > 0 || memberSettlement.toPay > 0)) {
          hasPendingSettlements = true;
        }
      });

      if (hasPendingSettlements) {
        return { success: false, error: "Cannot remove member with pending settlements. Please settle all debts first." };
      }

      const updatedMembers = group.members.filter(m => m.id !== memberId);
      const groupRef = ref(database, `groups/${groupId}/members`);

      await retryOperation(() => set(groupRef, updatedMembers));

      return { success: true };
    } catch (error: any) {
      console.error("Remove member error:", error);
      return { success: false, error: error.message || "Failed to remove member" };
    }
  };

  const updateMemberPaymentDetails = async (groupId: string, memberId: string, paymentDetails: PaymentDetails, phone?: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return { success: false, error: "Group not found" };

      const memberIndex = group.members.findIndex(m => m.id === memberId);
      if (memberIndex === -1) {
        return { success: false, error: "Member not found" };
      }

      const updatedMembers = [...group.members];
      updatedMembers[memberIndex] = {
        ...updatedMembers[memberIndex],
        paymentDetails: paymentDetails || {},
        phone: phone ? sanitizeString(phone) : null,
      };

      const groupRef = ref(database, `groups/${groupId}/members`);
      await retryOperation(() => set(groupRef, updatedMembers));

      return { success: true };
    } catch (error: any) {
      console.error("Update member payment details error:", error);
      return { success: false, error: error.message || "Failed to update member details" };
    }
  };

  const addExpense = async (data: {
    groupId: string;
    amount: number;
    paidBy: string;
    participants: string[];
    note: string;
    place: string
  }): Promise<{ success: boolean; error?: string; transaction?: Transaction }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    // Validate input
    const validation = validateExpenseData(data);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(", ") };
    }

    const transaction = new TransactionManager();

    try {
      const group = groups.find((g) => g.id === data.groupId);
      if (!group) return { success: false, error: "Group not found" };

      const sanitizedAmount = sanitizeAmount(data.amount);
      const sanitizedNote = sanitizeString(data.note);
      const sanitizedPlace = sanitizeString(data.place);

      const payer = group.members.find((m) => m.id === data.paidBy);
      const participantMembers = group.members.filter((m) => data.participants.includes(m.id));

      if (!payer) {
        return { success: false, error: "Invalid payer ID" };
      }

      if (participantMembers.length === 0) {
        return { success: false, error: "No valid participants found" };
      }

      // CORRECTED: Use proper expense splitting logic
      const splits = calculateExpenseSplit(
        sanitizedAmount,
        participantMembers.map(m => ({ id: m.id, name: m.name })),
        data.paidBy
      );

      logger.info("Expense split calculated", {
        amount: sanitizedAmount,
        participants: participantMembers.length,
        splits: splits.map(s => ({ id: s.participantId, amount: s.amount }))
      });

      // CORRECTED: Calculate proper settlement updates with group context
      const settlementUpdates = calculateExpenseSettlements(
        splits,
        data.paidBy,
        user.uid,
        data.groupId
      );

      const isCurrentUserPayer = payer.isCurrentUser;
      const currentUserSplit = splits.find(s => s.participantId === user.uid);

      if (isCurrentUserPayer) {
        // CORRECTED: User pays expense - deduct full amount from wallet
        transaction.addOperation({
          execute: async () => {
            const result = await deductMoneyFromWallet(sanitizedAmount);
            if (!result.success) {
              throw new Error(result.error || "Insufficient wallet balance");
            }
            logger.logTransaction("expense_payment", sanitizedAmount, true);
            return result;
          },
          rollback: async () => {
            await addToAuthWallet(sanitizedAmount);
            logger.warn("Rolled back expense payment", { amount: sanitizedAmount });
          },
          description: "Deduct expense amount from wallet"
        });

        // CORRECTED: Create proper receivables for others' shares only
        for (const update of settlementUpdates) {
          if (update.toReceiveChange > 0) {
            transaction.addOperation({
              execute: async () => {
                const result = await addToReceivable(update.groupId, update.personId, update.toReceiveChange);
                logger.info("Added receivable", {
                  personId: update.personId,
                  amount: update.toReceiveChange,
                  groupId: update.groupId
                });
                return result;
              },
              rollback: async () => {
                // CORRECTED: Proper rollback implementation
                try {
                  const settlements = getSettlements(update.groupId);
                  const currentSettlement = settlements[update.personId] || { toReceive: 0, toPay: 0 };
                  await updateSettlement(
                    update.groupId,
                    update.personId,
                    Math.max(0, currentSettlement.toReceive - update.toReceiveChange),
                    currentSettlement.toPay
                  );
                  logger.info("Rolled back receivable", {
                    personId: update.personId,
                    amount: update.toReceiveChange
                  });
                } catch (error) {
                  logger.error("Failed to rollback receivable", {
                    personId: update.personId,
                    amount: update.toReceiveChange,
                    error
                  });
                }
              },
              description: `Add receivable from ${update.personId}: Rs ${update.toReceiveChange}`
            });
          }
        }
      } else {
        // CORRECTED: Someone else pays - create debt to payer for user's share only
        for (const update of settlementUpdates) {
          if (update.toPayChange > 0) {
            transaction.addOperation({
              execute: async () => {
                const result = await addToPayable(update.groupId, update.personId, update.toPayChange);
                logger.info("Added payable", {
                  personId: update.personId,
                  amount: update.toPayChange,
                  groupId: update.groupId
                });
                return result;
              },
              rollback: async () => {
                // CORRECTED: Proper rollback implementation
                try {
                  const settlements = getSettlements(update.groupId);
                  const currentSettlement = settlements[update.personId] || { toReceive: 0, toPay: 0 };
                  await updateSettlement(
                    update.groupId,
                    update.personId,
                    currentSettlement.toReceive,
                    Math.max(0, currentSettlement.toPay - update.toPayChange)
                  );
                  logger.info("Rolled back payable", {
                    personId: update.personId,
                    amount: update.toPayChange
                  });
                } catch (error) {
                  logger.error("Failed to rollback payable", {
                    personId: update.personId,
                    amount: update.toPayChange,
                    error
                  });
                }
              },
              description: `Add debt to ${update.personId}: Rs ${update.toPayChange}`
            });
          }
        }
      }

      // CORRECTED: Calculate proper wallet balance after transaction
      const walletBalanceAfter = isCurrentUserPayer
        ? calculateWalletBalanceAfter(user.walletBalance, 'deduct', sanitizedAmount)
        : user.walletBalance;

      // Create transaction record
      const transactionsRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionsRef);
      const transactionId = newTransactionRef.key!;

      const newTransaction: Transaction = {
        id: transactionId,
        groupId: data.groupId,
        type: "expense",
        title: sanitizedNote || "Expense",
        amount: sanitizedAmount,
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        }),
        timestamp: Date.now(), // Store numeric timestamp for time display
        paidBy: data.paidBy,
        paidByName: payer.name,
        paidByIsTemporary: !!payer.isTemporary,
        participants: splits.map((split) => ({
          id: split.participantId,
          name: split.participantName,
          amount: split.amount,
          isTemporary: !!participantMembers.find(m => m.id === split.participantId)?.isTemporary
        })),
        place: sanitizedPlace || null,
        note: sanitizedNote || null,
        walletBalanceAfter: walletBalanceAfter, // CORRECTED: Proper balance calculation
        createdAt: new Date().toISOString(),
      };

      transaction.addOperation({
        execute: async () => {
          await retryOperation(() => set(newTransactionRef, newTransaction));
          logger.info("Created expense transaction", {
            transactionId,
            amount: sanitizedAmount,
            participants: splits.length
          });
          return newTransaction;
        },
        rollback: async () => {
          await retryOperation(() => remove(newTransactionRef));
          logger.info("Rolled back expense transaction", { transactionId });
        },
        description: "Create transaction record"
      });

      // Add transaction to all group members' transaction lists
      transaction.addOperation({
        execute: async () => {
          const memberPromises = group.members.map(async (member) => {
            if (member.userId) {
              const userTransactionRef = ref(database, `userTransactions/${member.userId}/${transactionId}`);
              await retryOperation(() => set(userTransactionRef, true));
            }
          });
          await Promise.all(memberPromises);
          logger.info("Added transaction to member lists", {
            transactionId,
            memberCount: group.members.length
          });
          return true;
        },
        rollback: async () => {
          const memberPromises = group.members.map(async (member) => {
            if (member.userId) {
              const userTransactionRef = ref(database, `userTransactions/${member.userId}/${transactionId}`);
              await retryOperation(() => remove(userTransactionRef));
            }
          });
          await Promise.all(memberPromises);
          logger.info("Rolled back transaction from member lists", { transactionId });
        },
        description: "Add transaction to member lists"
      });

      const result = await transaction.execute();

      if (result.success) {
        logger.logTransaction("expense_created", sanitizedAmount, true);

        // Send transaction notification emails (async, non-blocking)
        // Use setTimeout instead of setImmediate for better async behavior
        setTimeout(async () => {
          try {
            logger.info('Sending transaction notification emails for expense', { transactionId });

            // Prepare transaction data for email
            const transactionData: TransactionData = {
              id: transactionId,
              type: 'expense',
              title: sanitizedNote || "Expense",
              amount: sanitizedAmount,
              groupId: data.groupId,
              groupName: group.name,
              paidBy: data.paidBy,
              paidByName: payer.name,
              participants: data.participants,
              date: new Date().toISOString(),
              description: sanitizedNote || "Expense",
              method: 'cash'
            };

            // Send notification email to current user regardless of whether they're payer or participant
            const currentUserData: UserData = {
              uid: user.uid,
              email: user.email,
              name: user.name
            };

            const emailResult = await sendTransactionNotifications(transactionData, [currentUserData]);
            if (emailResult.success) {
              logger.info('Transaction notification email sent successfully', { transactionId });
            } else {
              logger.warn('Transaction notification email failed', { transactionId, errors: emailResult.errors });
            }

            // Send push notifications to all group members (including payer for testing)
            try {
              logger.info('Sending push notifications for expense', { transactionId, groupId: data.groupId });

              const membersWithUserId = group.members.filter(member => member.userId);
              console.log('📊 Members with userId:', membersWithUserId.map(m => ({ name: m.name, userId: m.userId })));

              const notificationPromises = membersWithUserId.map(async (member) => {
                try {
                  console.log(`📤 Sending push notification to ${member.name} (${member.userId})...`);

                  const requestBody = {
                    userId: member.userId,
                    title: `New Expense in ${group.name}`,
                    body: `${payer.name} paid Rs ${sanitizedAmount.toLocaleString()} for "${sanitizedNote || 'Expense'}"`,
                    icon: '/only-logo.png',
                    badge: '/only-logo.png',
                    tag: `expense-${transactionId}`,
                    data: {
                      type: 'expense',
                      transactionId,
                      groupId: data.groupId,
                      amount: sanitizedAmount
                    }
                  };

                  console.log('📤 Request body:', requestBody);

                  // Add cache-busting timestamp to URL
                  const apiUrl = `${import.meta.env.VITE_API_URL}/api/push-notify?t=${Date.now()}`;
                  console.log('📤 API URL:', apiUrl);

                  const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Cache-Control': 'no-cache'
                    },
                    body: JSON.stringify(requestBody)
                  });

                  const responseData = await response.json();
                  console.log(`📥 Response for ${member.name}:`, responseData);

                  if (response.ok) {
                    console.log(`✅ Push notification sent to ${member.name}`);
                  } else {
                    console.warn(`⚠️ Push notification failed for ${member.name}:`, responseData);
                  }
                } catch (error) {
                  console.error(`❌ Failed to send push notification to ${member.name}:`, error);
                }
              });

              await Promise.allSettled(notificationPromises);
              logger.info('Push notifications sent to all members', { transactionId });

            } catch (pushError: any) {
              logger.error('Failed to send push notifications', { transactionId, error: pushError.message });
              // Push notification failure doesn't affect transaction success
            }

          } catch (emailError: any) {
            logger.error('Failed to send transaction notification emails', { transactionId, error: emailError.message });
            // Email failure doesn't affect transaction success
          }
        }, 0); // Use setTimeout with 0ms delay for better async behavior
      } else {
        logger.logTransaction("expense_failed", sanitizedAmount, false);
      }

      return { success: result.success, error: result.error, transaction: result.success ? newTransaction : undefined };
    } catch (error: any) {
      logger.error("Add expense error", {
        groupId: data.groupId,
        amount: data.amount,
        error: error.message
      });
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
  }): Promise<{ success: boolean; error?: string; transaction?: Transaction }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    // Validate input
    const validation = validatePaymentData(data);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(", ") };
    }

    const transaction = new TransactionManager();

    try {
      const group = groups.find((g) => g.id === data.groupId);
      if (!group) return { success: false, error: "Group not found" };

      const sanitizedAmount = sanitizeAmount(data.amount);
      const sanitizedNote = data.note ? sanitizeString(data.note) : null;

      const fromPerson = group.members.find((m) => m.id === data.fromMember);
      const toPerson = group.members.find((m) => m.id === data.toMember);

      if (!fromPerson || !toPerson) {
        return { success: false, error: "Invalid member IDs" };
      }

      // CORRECTED: Validate payment amount against actual debt with group context
      const settlements = getSettlements(data.groupId);

      let actualDebt = 0;
      if (data.fromMember === user.uid) {
        // Current user is paying - check how much they owe to toPerson in this group
        const settlement = settlements[data.toMember] || { toReceive: 0, toPay: 0 };
        actualDebt = settlement.toPay;
      } else if (data.toMember === user.uid) {
        // Current user is receiving - check how much fromPerson owes them in this group
        const settlement = settlements[data.fromMember] || { toReceive: 0, toPay: 0 };
        actualDebt = settlement.toReceive;
      }

      const paymentValidation = validatePaymentAmount(sanitizedAmount, actualDebt, true); // Allow overpayment
      if (!paymentValidation.isValid) {
        logger.warn("Invalid payment amount", {
          requestedAmount: sanitizedAmount,
          actualDebt,
          error: paymentValidation.error
        });
        // Allow the payment but log the warning - user might know something we don't
      }

      // Create transaction record first
      const transactionsRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionsRef);
      const transactionId = newTransactionRef.key!;

      // FIXED: Calculate proper wallet balance after payment
      // If current user is receiving money, balance increases
      // If current user is paying, balance decreases
      const isReceiving = data.toMember === user.uid;
      const walletBalanceBefore = user.walletBalance || 0;
      const walletBalanceAfter = isReceiving
        ? walletBalanceBefore + sanitizedAmount
        : walletBalanceBefore - sanitizedAmount;

      const newTransaction: Transaction = {
        id: transactionId,
        groupId: data.groupId,
        type: "payment",
        title: "Payment",
        amount: sanitizedAmount,
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        }),
        timestamp: Date.now(), // Store numeric timestamp for time display
        paidBy: data.fromMember,
        paidByName: fromPerson.name,
        paidByIsTemporary: !!fromPerson.isTemporary,
        from: data.fromMember,
        fromName: fromPerson.name,
        fromIsTemporary: !!fromPerson.isTemporary,
        to: data.toMember,
        toName: toPerson.name,
        toIsTemporary: !!toPerson.isTemporary,
        method: data.method,
        note: sanitizedNote,
        walletBalanceBefore: walletBalanceBefore,
        walletBalanceAfter: walletBalanceAfter,
        createdAt: new Date().toISOString(),
      };

      transaction.addOperation({
        execute: async () => {
          await retryOperation(() => set(newTransactionRef, newTransaction));
          logger.info("Created payment transaction", {
            transactionId,
            from: data.fromMember,
            to: data.toMember,
            amount: sanitizedAmount
          });
          return newTransaction;
        },
        rollback: async () => {
          await retryOperation(() => remove(newTransactionRef));
          logger.info("Rolled back payment transaction", { transactionId });
        },
        description: "Create payment transaction"
      });

      // Add transaction to relevant members' transaction lists
      transaction.addOperation({
        execute: async () => {
          const memberPromises = group.members
            .filter(member => member.userId && (member.id === data.fromMember || member.id === data.toMember))
            .map(async (member) => {
              const userTransactionRef = ref(database, `userTransactions/${member.userId}/${transactionId}`);
              await retryOperation(() => set(userTransactionRef, true));
            });
          await Promise.all(memberPromises);
          logger.info("Added payment to member transaction lists", {
            transactionId,
            fromMember: data.fromMember,
            toMember: data.toMember
          });
          return true;
        },
        rollback: async () => {
          const memberPromises = group.members
            .filter(member => member.userId && (member.id === data.fromMember || member.id === data.toMember))
            .map(async (member) => {
              const userTransactionRef = ref(database, `userTransactions/${member.userId}/${transactionId}`);
              await retryOperation(() => remove(userTransactionRef));
            });
          await Promise.all(memberPromises);
          logger.info("Rolled back payment from member transaction lists", { transactionId });
        },
        description: "Add payment to member transaction lists"
      });

      const result = await transaction.execute();

      if (result.success) {
        // CRITICAL FIX: Update settlements and wallet after transaction is created
        if (data.toMember === user.uid) {
          // Current user is receiving payment - add money to wallet and update settlements
          try {
            // Step 1: Add money to wallet
            const walletResult = await addToAuthWallet(sanitizedAmount);
            if (walletResult.success) {
              // Step 2: Update settlements (reduce receivable)
              const settlements = getSettlements(data.groupId);
              const currentSettlement = settlements[data.fromMember] || { toReceive: 0, toPay: 0 };
              await updateSettlement(
                data.groupId,
                data.fromMember,
                Math.max(0, currentSettlement.toReceive - sanitizedAmount),
                currentSettlement.toPay
              );
              logger.info("Updated wallet and settlements for payment received", {
                amount: sanitizedAmount,
                fromMember: data.fromMember
              });
            } else {
              logger.error("Failed to add money to wallet", { error: walletResult.error });
            }
          } catch (error: any) {
            logger.error("Failed to update wallet/settlements after payment", { transactionId, error: error.message });
          }
        } else if (data.fromMember === user.uid) {
          // Current user is making payment - deduct from wallet and update settlements
          try {
            // Step 1: Deduct money from wallet
            const walletResult = await deductMoneyFromWallet(sanitizedAmount);
            if (walletResult.success) {
              // Step 2: Update settlements (reduce payable)
              const settlements = getSettlements(data.groupId);
              const currentSettlement = settlements[data.toMember] || { toReceive: 0, toPay: 0 };
              await updateSettlement(
                data.groupId,
                data.toMember,
                currentSettlement.toReceive,
                Math.max(0, currentSettlement.toPay - sanitizedAmount)
              );
              logger.info("Updated wallet and settlements for payment made", {
                transactionId,
                amount: sanitizedAmount,
                toMember: data.toMember
              });
            } else {
              logger.error("Failed to deduct money from wallet", { transactionId, error: walletResult.error });
            }
          } catch (error: any) {
            logger.error("Failed to update wallet/settlements after debt payment", { transactionId, error: error.message });
          }
        }

        logger.logTransaction("payment_recorded", sanitizedAmount, true);

        // Send transaction notification emails (async, non-blocking)
        setTimeout(async () => {
          try {
            logger.info('Sending transaction notification emails for payment', { transactionId });

            // Prepare transaction data for email
            const transactionData: TransactionData = {
              id: transactionId,
              type: 'payment',
              title: "Payment Made",
              amount: sanitizedAmount,
              groupId: data.groupId,
              groupName: group.name,
              paidBy: data.fromMember,
              paidByName: fromPerson.name,
              participants: [data.fromMember, data.toMember],
              date: new Date().toISOString(),
              description: sanitizedNote || "Payment",
              method: data.method
            };

            // Send notification email to current user regardless of their role in the payment
            const currentUserData: UserData = {
              uid: user.uid,
              email: user.email,
              name: user.name
            };

            const emailResult = await sendTransactionNotifications(transactionData, [currentUserData]);
            if (emailResult.success) {
              logger.info('Payment notification email sent successfully', { transactionId });
            } else {
              logger.warn('Payment notification email failed', { transactionId, errors: emailResult.errors });
            }

          } catch (emailError: any) {
            logger.error('Failed to send payment notification email', { transactionId, error: emailError.message });
            // Email failure doesn't affect transaction success
          }
        }, 0); // Use setTimeout with 0ms delay for better async behavior
      } else {
        logger.logTransaction("payment_failed", sanitizedAmount, false);
      }

      return { success: result.success, error: result.error, transaction: result.success ? newTransaction : undefined };
    } catch (error: any) {
      logger.error("Record payment error", {
        groupId: data.groupId,
        fromMember: data.fromMember,
        toMember: data.toMember,
        amount: data.amount,
        error: error.message
      });
      return { success: false, error: error.message || "Failed to record payment" };
    }
  };

  const payMyDebt = async (groupId: string, toMember: string, amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    const validation = validateAmount(amount);
    if (!validation.isValid) {
      return { success: false, error: validation.error || "Invalid amount" };
    }

    try {
      const sanitizedAmount = sanitizeAmount(amount);

      // Use the enterprise settlement system with group context
      const result = await markDebtPaid(groupId, toMember, sanitizedAmount);
      return result;
    } catch (error: any) {
      logger.error("Pay debt error", { groupId, toMember, amount, error: error.message });
      return { success: false, error: error.message || "Failed to pay debt" };
    }
  };

  const markPaymentAsPaid = async (groupId: string, fromMember: string, amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    const validation = validateAmount(amount);
    if (!validation.isValid) {
      return { success: false, error: validation.error || "Invalid amount" };
    }

    try {
      const sanitizedAmount = sanitizeAmount(amount);

      // Use the enterprise settlement system with group context
      const result = await markPaymentReceived(groupId, fromMember, sanitizedAmount);
      return result;
    } catch (error: any) {
      logger.error("Mark payment as paid error", { groupId, fromMember, amount, error: error.message });
      return { success: false, error: error.message || "Failed to mark payment as paid" };
    }
  };

  const addMoneyToWallet = async (amount: number, note?: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    const validation = validateAmount(amount);
    if (!validation.isValid) {
      return { success: false, error: validation.error || "Invalid amount" };
    }

    const transaction = new TransactionManager();

    try {
      const sanitizedAmount = sanitizeAmount(amount);
      const sanitizedNote = note ? sanitizeString(note) : null;

      transaction.addOperation({
        execute: async () => {
          const result = await addToAuthWallet(sanitizedAmount);
          if (!result.success) {
            throw new Error(result.error || "Failed to add money to wallet");
          }
          return result;
        },
        rollback: async () => {
          await deductMoneyFromWallet(sanitizedAmount);
        },
        description: "Add money to wallet"
      });

      // Create wallet transaction record
      const transactionsRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionsRef);
      const transactionId = newTransactionRef.key!;

      const walletTransaction: Transaction = {
        id: transactionId,
        groupId: "wallet",
        type: "wallet_add",
        title: "Money Added to Wallet",
        amount: sanitizedAmount,
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        }),
        timestamp: Date.now(), // Store numeric timestamp for time display
        paidBy: user.uid,
        paidByName: user.name,
        note: sanitizedNote,
        walletBalanceBefore: user.walletBalance,
        walletBalanceAfter: user.walletBalance + sanitizedAmount,
        createdAt: new Date().toISOString(),
      };

      transaction.addOperation({
        execute: async () => {
          await retryOperation(() => set(newTransactionRef, walletTransaction));
          return walletTransaction;
        },
        rollback: async () => {
          await retryOperation(() => remove(newTransactionRef));
        },
        description: "Create wallet transaction record"
      });

      transaction.addOperation({
        execute: async () => {
          const userTransactionRef = ref(database, `userTransactions/${user.uid}/${transactionId}`);
          await retryOperation(() => set(userTransactionRef, true));
          return true;
        },
        rollback: async () => {
          const userTransactionRef = ref(database, `userTransactions/${user.uid}/${transactionId}`);
          await retryOperation(() => remove(userTransactionRef));
        },
        description: "Add wallet transaction to user's list"
      });

      const result = await transaction.execute();
      return { success: result.success, error: result.error };
    } catch (error: any) {
      console.error("Add money to wallet error:", error);
      return { success: false, error: error.message || "Failed to add money to wallet" };
    }
  };

  // Improved implementations for other methods
  const updateGroup = async (groupId: string, data: Partial<Group>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return { success: false, error: "Group not found" };

      if (group.createdBy !== user.uid) {
        return { success: false, error: "Only group creator can update group details" };
      }

      // Sanitize update data
      const sanitizedData: Partial<Group> = {};
      if (data.name) sanitizedData.name = sanitizeString(data.name);
      if (data.emoji) sanitizedData.emoji = sanitizeString(data.emoji);

      const groupRef = ref(database, `groups/${groupId}`);
      await retryOperation(() => update(groupRef, sanitizedData));

      return { success: true };
    } catch (error: any) {
      console.error("Update group error:", error);
      return { success: false, error: error.message || "Failed to update group" };
    }
  };

  const deleteGroup = async (groupId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    const transaction = new TransactionManager();

    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return { success: false, error: "Group not found" };

      if (group.createdBy !== user.uid) {
        return { success: false, error: "Only group creator can delete the group" };
      }

      // Check for pending settlements in this specific group
      const settlements = getSettlements(groupId);

      const hasPendingSettlements = Object.values(settlements).some((settlement: any) =>
        settlement.toReceive > 0 || settlement.toPay > 0
      );

      if (hasPendingSettlements) {
        return { success: false, error: "Cannot delete group with pending settlements. Please settle all debts first." };
      }

      transaction.addOperation({
        execute: async () => {
          const groupRef = ref(database, `groups/${groupId}`);
          await retryOperation(() => remove(groupRef));
          return true;
        },
        rollback: async () => {
          const groupRef = ref(database, `groups/${groupId}`);
          await retryOperation(() => set(groupRef, group));
        },
        description: "Delete group"
      });

      transaction.addOperation({
        execute: async () => {
          const userGroupRef = ref(database, `userGroups/${user.uid}/${groupId}`);
          await retryOperation(() => remove(userGroupRef));
          return true;
        },
        rollback: async () => {
          const userGroupRef = ref(database, `userGroups/${user.uid}/${groupId}`);
          await retryOperation(() => set(userGroupRef, true));
        },
        description: "Remove group from user's groups"
      });

      const result = await transaction.execute();
      return { success: result.success, error: result.error };
    } catch (error: any) {
      console.error("Delete group error:", error);
      return { success: false, error: error.message || "Failed to delete group" };
    }
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
        payMyDebt,
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