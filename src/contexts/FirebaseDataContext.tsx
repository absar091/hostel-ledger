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
import { sendTransactionNotifications, triggerPushNotification, TransactionData, UserData } from "@/lib/transactionNotifications";
import { callSecureApi } from "@/lib/api";
import { saveOfflineExpense } from "@/lib/offlineDB";

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
  memberCount?: number;
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
  userIsPayer?: boolean;
  userIsParticipant?: boolean;
  userShare?: number;
  userRole?: 'payer' | 'receiver' | 'none';
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
  fetchGroupDetail: (groupId: string) => Promise<Group | null>;
  getTransactionsByGroup: (groupId: string) => Transaction[];
  getTransactionsByMember: (groupId: string, memberId: string) => Transaction[];
  getAllTransactions: () => Transaction[];
}

const FirebaseDataContext = createContext<FirebaseDataContextType | undefined>(undefined);

export const FirebaseDataProvider = ({ children }: { children: ReactNode }) => {
  const {
    user,
    addMoneyToWallet: authAddMoneyToWallet,
    markPaymentReceived,
    markDebtPaid,
    getSettlements
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

    // Try to load cached data immediately if offline
    const loadCachedDataIfOffline = async () => {
      if (!navigator.onLine) {
        console.log('📱 Offline detected - loading cached data immediately...');
        try {
          const { getCachedGroups, getCachedTransactions } = await import('@/lib/offlineDB');
          const [cachedGroups, cachedTransactions] = await Promise.all([
            getCachedGroups(),
            getCachedTransactions()
          ]);

          if (cachedGroups.length > 0 || cachedTransactions.length > 0) {
            console.log('✅ Loaded cached data:', cachedGroups.length, 'groups,', cachedTransactions.length, 'transactions');
            setGroups(cachedGroups);
            setTransactions(cachedTransactions);
            setIsLoading(false);
            return true; // Cached data loaded, skip Firebase
          }
        } catch (error) {
          console.error('Failed to load cached data:', error);
        }
      }
      return false; // No cached data or online
    };

    // Add a small delay to ensure Firebase auth is fully established
    const setupListeners = async () => {
      try {
        // Try to load cached data first if offline
        const cachedDataLoaded = await loadCachedDataIfOffline();

        // If offline and cached data loaded, don't set up Firebase listeners
        if (cachedDataLoaded) {
          console.log('✅ Offline mode - using cached data only, skipping Firebase listeners');
          return () => { }; // Return empty cleanup function
        }

        // Wait a bit for auth to be fully established (only if online)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Listen to user's groups with error handling
        const groupsRef = ref(database, `userGroups/${user.uid}`);
        const groupsListener = onValue(groupsRef, async (snapshot) => {
          try {
            if (snapshot.exists()) {
              const userGroups = snapshot.val();
              const groupPromises = Object.entries(userGroups).map(async ([id, metadata]: [string, any]) => {
                // ALWAYS fetch full group data to ensure members are loaded
                // The metadata path had a stale closure bug causing "0 members"
                try {
                  const groupRef = ref(database, `groups/${id}`);
                  const groupSnapshot = await get(groupRef);
                  if (groupSnapshot.exists()) {
                    const fullData = groupSnapshot.val();
                    const group = { id, ...fullData };

                    // Update the index if needed (for quick name display during next load)
                    if (typeof metadata !== 'object' || !metadata.name) {
                      const userGroupMetadataRef = ref(database, `userGroups/${user.uid}/${id}`);
                      set(userGroupMetadataRef, {
                        name: group.name,
                        emoji: group.emoji,
                        coverPhoto: group.coverPhoto || null,
                        memberCount: group.members?.length || 0,
                        createdBy: group.createdBy,
                        createdAt: group.createdAt
                      }).catch(err => console.error("Index migration failed:", err));
                    }

                    return group;
                  }
                } catch (err) {
                  console.error(`Failed to fetch group ${id}:`, err);

                  // Fallback to metadata if fetch fails (offline scenario)
                  if (typeof metadata === 'object' && metadata !== null && metadata.name) {
                    return {
                      id,
                      name: metadata.name,
                      emoji: metadata.emoji || "📁",
                      coverPhoto: metadata.coverPhoto,
                      members: [], // Empty but memberCount will show count
                      memberCount: metadata.memberCount || 0,
                      createdBy: metadata.createdBy || "",
                      createdAt: metadata.createdAt || ""
                    };
                  }
                }
                return null;
              });

              const groupsList = (await Promise.all(groupPromises)).filter(Boolean) as Group[];
              setGroups(groupsList);

              // Cache groups to IndexedDB for offline access
              try {
                const { cacheGroups } = await import('@/lib/offlineDB');
                await cacheGroups(groupsList);
              } catch (cacheError) {
                console.error('Failed to cache groups:', cacheError);
              }
            } else {
              setGroups([]);
            }
          } catch (error: any) {
            logger.error("Error loading groups", { uid: user.uid, error: error.message });

            // Try to load cached groups on error
            try {
              const { getCachedGroups } = await import('@/lib/offlineDB');
              const cachedGroups = await getCachedGroups();
              if (cachedGroups.length > 0) {
                console.log('✅ Loaded cached groups on error');
                setGroups(cachedGroups);
              } else {
                setGroups([]);
              }
            } catch (cacheError) {
              console.error('Failed to load cached groups:', cacheError);
              setGroups([]);
            }
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
              const userTransactions = snapshot.val();
              const transactionPromises = Object.entries(userTransactions).map(async ([id, data]: [string, any]) => {
                // ALWAYS fetch full transaction data to ensure participants are loaded
                // The metadata shortcut was missing the participants array causing missing chips
                try {
                  const txRef = ref(database, `transactions/${id}`);
                  const txSnapshot = await get(txRef);
                  if (txSnapshot.exists()) {
                    const fullTx = txSnapshot.val();
                    return { id, ...fullTx };
                  }
                } catch (err) {
                  console.error(`Failed to fetch transaction ${id}:`, err);
                  // Fallback to metadata if fetch fails (offline scenario)
                  if (typeof data === 'object' && data !== null && data.type) {
                    return {
                      id,
                      groupId: data.groupId || "unknown",
                      type: data.type || "expense",
                      title: data.title || "Transaction",
                      amount: data.amount || 0,
                      date: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "Unknown Date",
                      createdAt: data.createdAt || new Date().toISOString(),
                      timestamp: data.timestamp || Date.now(),
                      paidBy: data.paidBy || "",
                      paidByName: data.paidByName || "",
                      participants: [], // Empty in offline fallback
                      fromName: data.fromName || "",
                      toName: data.toName || ""
                    } as Transaction;
                  }
                }
                return null;
              });

              const transactionsList = (await Promise.all(transactionPromises)).filter(Boolean) as Transaction[];
              const sortedTransactions = transactionsList.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );

              setTransactions(sortedTransactions);

              // Cache transactions to IndexedDB for offline access
              try {
                const { cacheTransactions } = await import('@/lib/offlineDB');
                await cacheTransactions(sortedTransactions);
              } catch (cacheError) {
                console.error('Failed to cache transactions:', cacheError);
              }
            } else {
              setTransactions([]);
            }
          } catch (error: any) {
            logger.error("Error loading transactions", { uid: user.uid, error: error.message });

            // Try to load cached transactions on error
            try {
              const { getCachedTransactions } = await import('@/lib/offlineDB');
              const cachedTransactions = await getCachedTransactions();
              if (cachedTransactions.length > 0) {
                console.log('✅ Loaded cached transactions on error');
                setTransactions(cachedTransactions);
              } else {
                setTransactions([]);
              }
            } catch (cacheError) {
              console.error('Failed to load cached transactions:', cacheError);
              setTransactions([]);
            }
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

      const newGroup: Partial<Group> = {
        id: groupId,
        name: data.name.trim().substring(0, 50),
        emoji: data.emoji.trim().substring(0, 10),
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

      // Only add coverPhoto if it exists (Firebase doesn't allow undefined)
      if (data.coverPhoto) {
        newGroup.coverPhoto = data.coverPhoto;
      }

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
          const groupMetadata = {
            name: newGroup.name,
            emoji: newGroup.emoji,
            coverPhoto: newGroup.coverPhoto || null,
            memberCount: newGroup.members.length,
            createdBy: user.uid,
            createdAt: newGroup.createdAt
          };
          await retryOperation(() => set(userGroupRef, groupMetadata));
          return true;
        },
        rollback: async () => {
          const userGroupRef = ref(database, `userGroups/${user.uid}/${groupId}`);
          await retryOperation(() => remove(userGroupRef));
        },
        description: "Add group metadata to user's groups index"
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

      // Update denormalized count for the current user
      const userGroupMetadataCountRef = ref(database, `userGroups/${user.uid}/${groupId}/memberCount`);
      set(userGroupMetadataCountRef, updatedMembers.length).catch(e => console.error("Failed to update index count", e));

      return { success: true, memberId: newMember.id };
    } catch (error: any) {
      console.error("Add member error:", error);
      return { success: false, error: error.message || "Failed to add member" };
    }
  };

  const removeMemberFromGroup = async (groupId: string, memberId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      // 1. Get Group Data
      const groupRef = ref(database, `groups/${groupId}`);
      const snapshot = await get(groupRef);
      if (!snapshot.exists()) return { success: false, error: "Group not found" };

      const groupData = snapshot.val();
      if (groupData.createdBy !== user.uid) {
        return { success: false, error: "Only the group creator can remove members" };
      }

      // 2. Logic Fix: Check per-group settlements instead of global aggregate
      const settlements = getSettlements(groupId);
      const memberSettlement = settlements[memberId] || { toReceive: 0, toPay: 0 };

      const hasDebt = memberSettlement.toReceive > 0 || memberSettlement.toPay > 0;
      if (hasDebt) {
        return { success: false, error: "Cannot remove a member with unsettled debts in this group" };
      }

      // Don't allow removing the current user
      if (memberId === user.uid) {
        return { success: false, error: "Cannot remove yourself from the group" };
      }

      const memberToRemove = groupData.members.find((m: GroupMember) => m.id === memberId);
      if (!memberToRemove) {
        return { success: false, error: "Member not found" };
      }

      const updatedMembers = groupData.members.filter((m: GroupMember) => m.id !== memberId);
      const groupMembersRef = ref(database, `groups/${groupId}/members`);

      await retryOperation(() => set(groupMembersRef, updatedMembers));

      // Update denormalized count for the current user
      const userGroupMetadataCountRef = ref(database, `userGroups/${user.uid}/${groupId}/memberCount`);
      set(userGroupMetadataCountRef, updatedMembers.length).catch(e => console.error("Failed to update index count", e));

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

    try {
      // Check online status
      if (!navigator.onLine) {
        logger.info("Device offline, saving expense to IndexedDB", { groupId: data.groupId });
        const offlineId = await saveOfflineExpense({
          groupId: data.groupId,
          amount: data.amount,
          paidBy: data.paidBy,
          participants: data.participants,
          note: data.note,
          place: data.place
        });
        return { success: true, error: "Offline: saved to sync later" };
      }

      logger.info("Adding expense via secure API", { groupId: data.groupId, amount: data.amount });

      const result = await callSecureApi('/api/add-expense', {
        groupId: data.groupId,
        amount: data.amount,
        paidBy: data.paidBy,
        participants: data.participants,
        note: data.note,
        place: data.place
      });

      if (result.success) {
        logger.info("Expense added successfully via server", { transactionId: result.transactionId });
        return { success: true, transaction: result.transaction };
      }

      return { success: false, error: result.error || "Failed to add expense" };
    } catch (error: any) {
      logger.error("Add expense error", {
        groupId: data.groupId,
        amount: data.amount,
        error: error.message
      });

      // Fallback to offline if API call fails due to network
      if (!navigator.onLine || error.message.includes('fetch') || error.message.includes('Network')) {
        const offlineId = await saveOfflineExpense({
          groupId: data.groupId,
          amount: data.amount,
          paidBy: data.paidBy,
          participants: data.participants,
          note: data.note,
          place: data.place
        });
        return { success: true, error: "Network error: saved to sync later" };
      }

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

    try {
      // Check online status - currently offline payments aren't in offlineDB schema but we can add them or use app-data
      if (!navigator.onLine) {
        return { success: false, error: "Payments require internet connection to verify balances" };
      }

      logger.info("Recording payment via secure API", { groupId: data.groupId, amount: data.amount });

      const result = await callSecureApi('/api/record-payment', {
        groupId: data.groupId,
        fromMember: data.fromMember,
        toMember: data.toMember,
        amount: data.amount,
        method: data.method,
        note: data.note
      });

      if (result.success) {
        logger.info("Payment recorded successfully via server", { transactionId: result.transactionId });
        return { success: true, transaction: result.transaction };
      }

      return { success: false, error: "Failed to record payment" };
    } catch (error: any) {
      logger.error("Record payment API error", {
        groupId: data.groupId,
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

    try {
      const sanitizedAmount = sanitizeAmount(amount);
      const sanitizedNote = note ? sanitizeString(note) : undefined;

      // Use the secured auth context method which calls the backend
      return await authAddMoneyToWallet(sanitizedAmount, sanitizedNote);
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

      // Also update the denormalized metadata in userGroups
      const userGroupMetadataRef = ref(database, `userGroups/${user.uid}/${groupId}`);
      await retryOperation(() => update(userGroupMetadataRef, sanitizedData));

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

  const fetchGroupDetail = async (groupId: string): Promise<Group | null> => {
    try {
      if (navigator.onLine) {
        const groupRef = ref(database, `groups/${groupId}`);
        const snapshot = await get(groupRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const fullGroup = { id: groupId, ...data };

          // Update global state with full details to fix "0 members" issue
          setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
              return {
                ...g, ...fullGroup,
                // Ensure memberCount matches the actual array length if available
                memberCount: fullGroup.members?.length || fullGroup.memberCount || 0
              };
            }
            return g;
          }));

          return fullGroup;
        }
      }

      // Offline or network fail fallback
      try {
        const { getCachedGroups } = await import('@/lib/offlineDB');
        const cachedGroups = await getCachedGroups();
        const cachedGroup = cachedGroups.find((g: any) => g.id === groupId);

        if (cachedGroup) {
          logger.info("Retrieved group from offline cache", { groupId });
          return cachedGroup;
        }
      } catch (cacheError) {
        console.error("Cache retrieval error:", cacheError);
      }

      return null;
    } catch (error) {
      console.error("Error fetching group detail:", error);

      // Secondary fallback check even on error
      try {
        const { getCachedGroups } = await import('@/lib/offlineDB');
        const cachedGroups = await getCachedGroups();
        return cachedGroups.find((g: any) => g.id === groupId) || null;
      } catch (e) {
        return null;
      }
    }
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
        fetchGroupDetail,
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