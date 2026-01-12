import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ref, push, set, update, remove, onValue, off, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { useFirebaseAuth, PaymentDetails } from "./FirebaseAuthContext";
import { validateExpenseData, validatePaymentData, validateGroupData, validateAmount, sanitizeString, sanitizeAmount } from "@/lib/validation";
import { TransactionManager, retryOperation } from "@/lib/transaction";
import { 
  calculateExpenseSplit, 
  calculateExpenseSettlements, 
  validateSettlementConsistency,
  calculateWalletBalanceAfter,
  validatePaymentAmount 
} from "@/lib/expenseLogic";
import { logger } from "@/lib/logger";

export interface GroupMember {
  id: string;
  name: string;
  isCurrentUser?: boolean;
  paymentDetails?: PaymentDetails;
  phone?: string | null;
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
  walletBalanceBefore?: number;
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
      } catch (error) {
        console.error("Error loading groups:", error);
        setGroups([]);
      } finally {
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Groups listener error:", error);
      setIsLoading(false);
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
      } catch (error) {
        console.error("Error loading transactions:", error);
        setTransactions([]);
      }
    }, (error) => {
      console.error("Transactions listener error:", error);
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

    // Validate input
    const validation = validateGroupData(data);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(", ") };
    }

    const transaction = new TransactionManager();

    try {
      const groupsRef = ref(database, 'groups');
      const newGroupRef = push(groupsRef);
      const groupId = newGroupRef.key!;

      const sanitizedMembers = data.members.map(m => ({
        name: sanitizeString(m.name),
        paymentDetails: m.paymentDetails || {},
        phone: m.phone ? sanitizeString(m.phone) : null,
      }));

      const newGroup: Group = {
        id: groupId,
        name: sanitizeString(data.name),
        emoji: sanitizeString(data.emoji),
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

  const addMemberToGroup = async (groupId: string, member: { name: string; paymentDetails?: PaymentDetails; phone?: string }): Promise<{ success: boolean; error?: string }> => {
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
        id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name: sanitizeString(member.name),
        paymentDetails: member.paymentDetails || {},
        phone: member.phone ? sanitizeString(member.phone) : null,
      };

      const updatedMembers = [...group.members, newMember];
      const groupRef = ref(database, `groups/${groupId}/members`);
      
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
  }): Promise<{ success: boolean; error?: string }> => {
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
        paidBy: data.paidBy,
        paidByName: payer.name,
        participants: splits.map((split) => ({
          id: split.participantId,
          name: split.participantName,
          amount: split.amount,
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
      } else {
        logger.logTransaction("expense_failed", sanitizedAmount, false);
      }
      
      return { success: result.success, error: result.error };
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
  }): Promise<{ success: boolean; error?: string }> => {
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
        paidBy: data.fromMember,
        paidByName: fromPerson.name,
        from: data.fromMember,
        fromName: fromPerson.name,
        to: data.toMember,
        toName: toPerson.name,
        method: data.method,
        note: sanitizedNote,
        walletBalanceAfter: user.walletBalance, // This will be updated by settlement functions
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
            logger.error("Failed to update wallet/settlements after payment", { error: error.message });
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
                amount: sanitizedAmount,
                toMember: data.toMember 
              });
            } else {
              logger.error("Failed to deduct money from wallet", { error: walletResult.error });
            }
          } catch (error: any) {
            logger.error("Failed to update wallet/settlements after debt payment", { error: error.message });
          }
        }
        
        logger.logTransaction("payment_recorded", sanitizedAmount, true);
      } else {
        logger.logTransaction("payment_failed", sanitizedAmount, false);
      }
      
      return { success: result.success, error: result.error };
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
      return { success: false, error: validation.errors.join(", ") };
    }

    try {
      const sanitizedAmount = sanitizeAmount(amount);
      
      // Use the enterprise settlement system with group context
      const result = await markDebtPaid(groupId, toMember, sanitizedAmount);
      return result;
    } catch (error: any) {
      console.error("Pay debt error:", error);
      return { success: false, error: error.message || "Failed to pay debt" };
    }
  };

  const markPaymentAsPaid = async (groupId: string, fromMember: string, amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    const validation = validateAmount(amount);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(", ") };
    }

    try {
      const sanitizedAmount = sanitizeAmount(amount);
      
      // Use the enterprise settlement system with group context
      const result = await markPaymentReceived(groupId, fromMember, sanitizedAmount);
      return result;
    } catch (error: any) {
      console.error("Mark payment as paid error:", error);
      return { success: false, error: error.message || "Failed to mark payment as paid" };
    }
  };

  const addMoneyToWallet = async (amount: number, note?: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    const validation = validateAmount(amount);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(", ") };
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