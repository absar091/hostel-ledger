import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
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

// Normalize members: Firebase may return object {memberId: {}, ...} instead of array
const normalizeMembers = (members: any, currentUserId?: string): any[] => {
  if (!members) return [];

  const membersArray = Array.isArray(members)
    ? members
    : Object.entries(members).map(([key, value]: [string, any]) => ({
      ...value,
      id: value.id || key // Ensure the key is used as the member id
    }));

  // If currentUserId is provided, rename that user to "You" for display
  if (currentUserId) {
    return membersArray.map((m: any) => {
      // Check both id and userId key for a match
      if (m.id === currentUserId || m.userId === currentUserId) {
        return { ...m, name: "You", isCurrentUser: true };
      }

      // Fix for legacy groups where creator was stored as "You"
      // If we see "You" but it's not the current user, rename it to avoid confusion
      if (m.name === "You") {
        return { ...m, name: "Group Owner" };
      }

      return m;
    });
  }

  return membersArray;
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
import { callSecureApi, sendInvitation } from "@/lib/api";
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
  createGroup: (data: { name: string; emoji: string; members: { name: string; paymentDetails?: PaymentDetails; phone?: string }[]; coverPhoto?: string; invitedUsernames?: string[] }) => Promise<{ success: boolean; groupId?: string; error?: string }>;
  updateGroup: (groupId: string, data: Partial<Group>) => Promise<{ success: boolean; error?: string }>;
  deleteGroup: (groupId: string) => Promise<{ success: boolean; error?: string }>;
  addMemberToGroup: (groupId: string, member: { id?: string; name: string; paymentDetails?: PaymentDetails; phone?: string; isTemporary?: boolean; deletionCondition?: 'SETTLED' | 'TIME_LIMIT' | null }) => Promise<{ success: boolean; error?: string; memberId?: string }>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberPaymentDetails: (groupId: string, memberId: string, paymentDetails: PaymentDetails, phone?: string) => Promise<{ success: boolean; error?: string }>;
  addExpense: (data: { groupId: string; amount: number; paidBy: string; participants: string[]; note: string; place: string; clientTxnId?: string }) => Promise<{ success: boolean; error?: string; transaction?: Transaction; duplicate?: boolean }>;
  recordPayment: (data: { groupId: string; fromMember: string; toMember: string; amount: number; method: "cash" | "online"; note?: string }) => Promise<{ success: boolean; error?: string; transaction?: Transaction }>;
  payMyDebt: (groupId: string, toMember: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  markPaymentAsPaid: (groupId: string, fromMember: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  addMoneyToWallet: (amount: number, note?: string) => Promise<{ success: boolean; error?: string }>;
  getGroupById: (groupId: string) => Group | undefined;
  fetchGroupDetail: (groupId: string) => Promise<Group | null>;
  getTransactionsByGroup: (groupId: string) => Transaction[];
  getTransactionsByMember: (groupId: string, memberId: string) => Transaction[];
  getAllTransactions: () => Transaction[];
  checkAccountDeletionEligibility: () => Promise<{ eligible: boolean; reason?: string }>;
  deleteAccountData: () => Promise<{ success: boolean; error?: string }>;
}

const FirebaseDataContext = createContext<FirebaseDataContextType | undefined>(undefined);

export const FirebaseDataProvider = ({ children }: { children: ReactNode }) => {
  const {
    user,
    firebaseUser,
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

        // Track active group listeners to clean them up when groups are removed
        // or when the component unmounts
        const groupUnsubscribes: Record<string, () => void> = {};

        const groupsListener = onValue(groupsRef, (snapshot) => {
          try {
            const userGroups = snapshot.exists() ? snapshot.val() : {};
            const groupIds = Object.keys(userGroups);

            // 1. Remove listeners for groups that are no longer in userGroups
            Object.keys(groupUnsubscribes).forEach(id => {
              if (!userGroups[id]) {
                // Determine if we should keep it? No, if it's gone from userGroups, remove listener
                if (groupUnsubscribes[id]) {
                  groupUnsubscribes[id]();
                  delete groupUnsubscribes[id];
                }

                // Update state to remove the group
                setGroups(prev => prev.filter(g => g.id !== id));
              }
            });

            // 2. Add listeners for new groups (or ensure existing ones are active)
            groupIds.forEach(id => {
              if (!groupUnsubscribes[id]) {
                const groupRef = ref(database, `groups/${id}`);

                // Set up REAL-TIME listener for this specific group
                groupUnsubscribes[id] = onValue(groupRef, (groupSnap) => {
                  if (groupSnap.exists()) {
                    const fullData = groupSnap.val();
                    const groupData = {
                      id,
                      ...fullData,
                      members: normalizeMembers(fullData.members, user?.uid)
                    };

                    // Update state carefully
                    setGroups(prev => {
                      const existingIndex = prev.findIndex(g => g.id === id);
                      if (existingIndex >= 0) {
                        // Check if data actually changed to avoid unnecessary re-renders
                        // (Deep comparison is expensive, so maybe just replace?)
                        // React keys usually handle this, but let's replace holding order
                        const newGroups = [...prev];
                        newGroups[existingIndex] = groupData;
                        return newGroups;
                      } else {
                        // Add new group
                        return [...prev, groupData].sort((a, b) =>
                          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        );
                      }
                    });

                    // Sync metadata block removed to prevent infinite loops from stale closures
                    // The memberCount and name are updated by typical usage anyway.
                  } else {
                    // Group data is missing (maybe deleted?), remove it?
                    // Keep logic simple for now.
                  }
                }, (err) => {
                  console.error(`Group listener error for ${id}:`, err);
                });
              }
            });

            // Handle empty state if no groups
            if (groupIds.length === 0) {
              setGroups([]);
            }

            setIsLoading(false); // Initial load done (or at least listeners set up)

          } catch (error: any) {
            logger.error("Error in groups listener", { uid: user.uid, error: error.message });
            setIsLoading(false);
          }
        }, (error) => {
          logger.error("Groups listener error", { uid: user.uid, error: error.message });
          setIsLoading(false);
        });  // Don't throw error, just log it and continue

        // Listen to user's transactions with error handling
        const transactionsRef = ref(database, `userTransactions/${user.uid}`);
        const transactionsListener = onValue(transactionsRef, async (snapshot) => {
          try {
            if (snapshot.exists()) {
              const userTransactions = snapshot.val();
              const transactionPromises = Object.entries(userTransactions).map(async ([id, data]: [string, any]) => {
                // OPTIMIZATION: Check if we have enough data in the summary to avoid N+1 fetch

                // 1. For expenses, we need the participants array (added in recent backend update)
                if (data && data.type === 'expense' && Array.isArray(data.participants) && data.participants.length > 0) {
                  return { id, ...data };
                }

                // 2. For payments, fast-path only when both IDs and names are present.
                // Some denormalized summaries only contain names, but downstream filters still
                // rely on `from`/`to` member IDs (e.g. member-ledger views).
                if (
                  data &&
                  data.type === 'payment' &&
                  data.from &&
                  data.to &&
                  data.fromName &&
                  data.toName
                ) {
                  return { id, ...data };
                }

                // 3. For wallet ops, summary is sufficient
                if (data && (data.type === 'wallet_add' || data.type === 'wallet_deduct')) {
                  return { id, ...data };
                }

                // Fallback: Fetch full transaction data if summary is incomplete (legacy data)
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

          // Cleanup dynamic group listeners
          Object.values(groupUnsubscribes).forEach(unsub => unsub());
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
    invitedUsernames?: string[]; // New: List of usernames to invite
    coverPhoto?: string;
  }): Promise<{ success: boolean; groupId?: string; error?: string }> => {
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

      // Send invitations if group creation was successful
      if (result.success && data.invitedUsernames && data.invitedUsernames.length > 0) {
        // We process invitations asynchronously but don't block success if one fails
        (async () => {
          await Promise.all(data.invitedUsernames!.map(async (username) => {
            try {
              await sendInvitation(groupId, username);
            } catch (invError) {
              console.error(`Failed to invite ${username}:`, invError);
            }
          }));
        })();
      }

      return { success: result.success, groupId: groupId, error: result.error };
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
    place: string;
    clientTxnId?: string;
  }): Promise<{ success: boolean; error?: string; transaction?: Transaction; duplicate?: boolean }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    // Generate or use existing clientTxnId
    const clientTxnId = data.clientTxnId || crypto.randomUUID();

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
          place: data.place,
          clientTxnId
        });
        return { success: true, error: "Offline: saved to sync later" };
      }

      logger.info("Adding expense via secure API", { groupId: data.groupId, amount: data.amount, clientTxnId });

      const result = await callSecureApi('/api/add-expense', {
        groupId: data.groupId,
        amount: data.amount,
        paidBy: data.paidBy,
        participants: data.participants,
        note: data.note,
        place: data.place,
        clientTxnId
      });

      if (result.success) {
        logger.info("Expense added successfully via server", { transactionId: result.transactionId, duplicate: result.duplicate });
        return { success: true, transaction: result.transaction, duplicate: result.duplicate };
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
          place: data.place,
          clientTxnId
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
      // Check online status - if offline, save to local DB
      if (!navigator.onLine) {
        try {
          const { saveOfflinePayment } = await import('@/lib/offlineDB');
          await saveOfflinePayment({
            groupId: data.groupId,
            fromMember: data.fromMember,
            toMember: data.toMember,
            amount: data.amount,
            method: data.method,
            note: data.note
          });
          return { success: true, error: "Offline: saved to sync later" };
        } catch (offlineError) {
          console.error("Failed to save offline payment", offlineError);
          return { success: false, error: "Offline save failed" };
        }
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

  const fetchGroupDetail = useCallback(async (groupId: string): Promise<Group | null> => {
    try {
      if (navigator.onLine) {
        const groupRef = ref(database, `groups/${groupId}`);
        const snapshot = await get(groupRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Normalize members: Firebase may return object instead of array
          const fullGroup = {
            id: groupId,
            ...data,
            members: normalizeMembers(data.members, user?.uid)
          };

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
  }, [user?.uid]);

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

  const checkAccountDeletionEligibility = async (): Promise<{ eligible: boolean; reason?: string }> => {
    if (isLoading) return { eligible: false, reason: "Please wait for data to load..." };

    if (!user) {
      // If user profile is missing but authenticated, assume no debt/data (safe to delete auth)
      if (firebaseUser) return { eligible: true };
      return { eligible: false, reason: "User not authenticated" };
    }

    // 1. Check Wallet Balance
    if (user.walletBalance > 0) {
      return { eligible: false, reason: "You have money in your wallet. Please withdraw it before deleting your account." };
    }

    // 2. Check Outstanding Settlements (Global)
    const settlements = getSettlements();
    let totalToReceive = 0;
    let totalToPay = 0;

    Object.values(settlements).forEach(s => {
      totalToReceive += s.toReceive;
      totalToPay += s.toPay;
    });

    if (totalToReceive > 0) {
      return { eligible: false, reason: "You have pending settlements to receive. Please collect them before deleting your account." };
    }

    if (totalToPay > 0) {
      return { eligible: false, reason: "You have pending debts to pay. Please settle them before deleting your account." };
    }

    // 3. Check Group Ownership
    // Iterate through groups to find ones owned by the user that have other members
    for (const group of groups) {
      if (group.createdBy === user.uid) {
        // Check if there are other members (excluding current user)
        const otherMembers = group.members.filter(m => m.userId !== user.uid && m.id !== user.uid && !m.isCurrentUser);
        if (otherMembers.length > 0) {
          return { eligible: false, reason: `You are the owner of group "${group.name}" with other members. Please remove them or delete the group first.` };
        }
      }
    }

    return { eligible: true };
  };

  const deleteAccountData = async (): Promise<{ success: boolean; error?: string }> => {
    if (isLoading) return { success: false, error: "Please wait for data to load..." };

    if (!user) {
      // If user profile is missing but authenticated, assume data is already gone
      if (firebaseUser) return { success: true };
      return { success: false, error: "User not authenticated" };
    }

    const eligibility = await checkAccountDeletionEligibility();
    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason };
    }

    const transaction = new TransactionManager();

    try {
      // 1. Remove from groups / Delete groups
      for (const group of groups) {
        if (group.createdBy === user.uid) {
          // Delete group (we know it has no other members from eligibility check)
          transaction.addOperation({
            execute: async () => {
              const groupRef = ref(database, `groups/${group.id}`);
              await retryOperation(() => remove(groupRef));
              return true;
            },
            rollback: async () => {
              // Deletion rollback is hard, skip for now
            },
            description: `Delete group ${group.name}`
          });
        } else {
          // Remove member from group
          // Find member entry that corresponds to current user
          // We check userId, id (legacy), or isCurrentUser
          const memberToRemove = group.members.find(m =>
            m.userId === user.uid ||
            (m.isCurrentUser) ||
            (m.name === "You" && m.id === user.uid) // Legacy check
          );

          if (memberToRemove) {
            const updatedMembers = group.members.filter(m => m.id !== memberToRemove.id);
            transaction.addOperation({
              execute: async () => {
                const membersRef = ref(database, `groups/${group.id}/members`);
                await retryOperation(() => set(membersRef, updatedMembers));
                return true;
              },
              rollback: async () => {
                const membersRef = ref(database, `groups/${group.id}/members`);
                await retryOperation(() => set(membersRef, group.members));
              },
              description: `Remove user from group ${group.name}`
            });

            // Also decrement member count for other users in that group?
            // The backend/listeners usually handle this, but for cleanup we might want to be thorough.
            // Since we are deleting the user entirely, we rely on the group update to propagate.
          }
        }
      }

      // 2. Delete User Groups Index
      transaction.addOperation({
        execute: async () => {
          const userGroupsRef = ref(database, `userGroups/${user.uid}`);
          await retryOperation(() => remove(userGroupsRef));
          return true;
        },
        rollback: async () => {},
        description: "Delete user groups index"
      });

      // 3. Delete User Transactions
      transaction.addOperation({
        execute: async () => {
          const userTransactionsRef = ref(database, `userTransactions/${user.uid}`);
          await retryOperation(() => remove(userTransactionsRef));
          return true;
        },
        rollback: async () => {},
        description: "Delete user transactions"
      });

      // 4. Delete Username
      if (user.username) {
        transaction.addOperation({
          execute: async () => {
            const usernameRef = ref(database, `usernames/${user.username}`);
            await retryOperation(() => remove(usernameRef));
            return true;
          },
          rollback: async () => {},
          description: "Delete username"
        });
      }

      // 5. Delete Email Verification
      transaction.addOperation({
        execute: async () => {
          const verificationRef = ref(database, `emailVerification/${user.uid}`);
          await retryOperation(() => remove(verificationRef));
          return true;
        },
        rollback: async () => {},
        description: "Delete email verification"
      });

      // 6. Delete User Profile
      transaction.addOperation({
        execute: async () => {
          const userRef = ref(database, `users/${user.uid}`);
          await retryOperation(() => remove(userRef));
          return true;
        },
        rollback: async () => {},
        description: "Delete user profile"
      });

      const result = await transaction.execute();
      return { success: result.success, error: result.error };

    } catch (error: any) {
      console.error("Delete account data error:", error);
      return { success: false, error: error.message || "Failed to delete account data" };
    }
  };

  const value = useMemo(() => ({
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
    checkAccountDeletionEligibility,
    deleteAccountData,
  }), [
    groups,
    transactions,
    isLoading,
    user?.uid, // Dependencies for functions that use user
    fetchGroupDetail
  ]);

  return (
    <FirebaseDataContext.Provider value={value}>
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
