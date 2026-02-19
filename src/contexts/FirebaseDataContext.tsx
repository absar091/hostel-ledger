import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { ref, push, set, update, remove, onValue, off, get, query, limitToLast, orderByChild } from "firebase/database";
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
      id: value.id || key, // Ensure the key is used as the member id
      isCurrentUser: false // Reset client-side property, ignore DB value
    }));

  console.log('Validating members:', membersArray.map((m: any) => ({
    id: m.id,
    name: m.name,
    userId: m.userId,
    currentUserId
  })));

  // If currentUserId is provided, rename that user to "You" for display
  if (currentUserId) {
    return membersArray.map((m: any) => {
      // Check both id and userId key for a match
      if (m.id === currentUserId || m.userId === currentUserId) {
        return { ...m, name: "You", isCurrentUser: true, isPending: false };
      }

      // Fix for legacy groups where creator was stored as "You"
      // If we see "You" but it's not the current user, rename it to avoid confusion
      // Use case-insensitive check and trim
      if (m.name && m.name.trim().toLowerCase() === "you") {
        return { ...m, name: "Group Owner" };
      }

      return m;
    });
  }

  // Fallback: If no currentUserId, still rename "You" to "Group Owner" to prevent confusion
  // as we don't know who "You" is.
  return membersArray.map((m: any) => {
    if (m.name && m.name.trim().toLowerCase() === "you") {
      return { ...m, name: "Group Owner" };
    }
    return m;
  });
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
import { callSecureApi, sendInvitation, sendExternalInvitation } from "@/lib/api";
import { saveOfflineExpense } from "@/lib/offlineDB";

export interface GroupMember {
  id: string;
  name: string;
  isCurrentUser?: boolean;
  paymentDetails?: PaymentDetails;
  phone?: string | null;
  userId?: string; // Firebase user ID for real users
  email?: string | null;
  isPending?: boolean;
  invitedAt?: string;
  balance?: number; // Calculated balance - optional since computed dynamically
  isTemporary?: boolean;
  tempId?: string;
  deletionCondition?: 'SETTLED' | 'TIME_LIMIT' | null;
  expiresAt?: number | null;
  deletionNotified?: boolean;
  photoURL?: string | null;
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
  isPersonal?: boolean; // NEW: Flag for private tracking
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
  createGroup: (data: { name: string; emoji: string; members: { name: string; paymentDetails?: PaymentDetails; phone?: string; email?: string }[]; coverPhoto?: string; invitedUsernames?: string[]; invitedEmails?: string[] }) => Promise<{ success: boolean; groupId?: string; error?: string }>;
  updateGroup: (groupId: string, data: Partial<Group>) => Promise<{ success: boolean; error?: string }>;
  deleteGroup: (groupId: string) => Promise<{ success: boolean; error?: string }>;
  addMemberToGroup: (groupId: string, member: { id?: string; name: string; paymentDetails?: PaymentDetails; phone?: string; isTemporary?: boolean; deletionCondition?: 'SETTLED' | 'TIME_LIMIT' | null }) => Promise<{ success: boolean; error?: string; memberId?: string }>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberPaymentDetails: (groupId: string, memberId: string, paymentDetails: PaymentDetails, phone?: string) => Promise<{ success: boolean; error?: string }>;
  addExpense: (data: { groupId: string; amount: number; paidBy: string; participants: string[]; note: string; place: string; clientTxnId?: string }) => Promise<{ success: boolean; error?: string; transaction?: Transaction; duplicate?: boolean }>;
  recordPayment: (data: { groupId: string; fromMember: string; toMember: string; amount: number; method: "cash" | "online"; note?: string }) => Promise<{ success: boolean; error?: string; transaction?: Transaction }>;
  mergeMembers: (groupId: string, fromMemberId: string, toMemberId: string) => Promise<{ success: boolean; error?: string }>;
  claimMemberProfile: (groupId: string, memberId: string) => Promise<{ success: boolean; error?: string }>;
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
  claimEmailInvite: (groupId: string) => Promise<{ success: boolean; error?: string }>;
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
        // REMOVED ARTIFICIAL DELAY for performance optimization
        // await new Promise(resolve => setTimeout(resolve, 1000));

        // Listen to user's groups with error handling
        const groupsRef = ref(database, `userGroups/${user.uid}`);

        const groupsListener = onValue(groupsRef, (snapshot) => {
          try {
            const userGroups = snapshot.exists() ? snapshot.val() : {};

            setGroups(prevGroups => {
              const newGroups = Object.entries(userGroups).map(([id, meta]: [string, any]) => {
                const existingGroup = prevGroups.find(g => g.id === id);

                // PERFORMANCE OPTIMIZATION: Lazy loading
                // Instead of fetching full group details (N+1 query), we use metadata from userGroups list
                // and preserve existing members if they were already loaded (e.g. by GroupDetail page or AddExpenseSheet).

                // If we have full details (members > 0), preserve them
                if (existingGroup && existingGroup.members && existingGroup.members.length > 0) {
                  return {
                    ...existingGroup,
                    ...meta, // Update metadata like name, emoji, etc.
                    id
                  };
                }

                // If members are empty or we don't have existing group, use metadata with empty members
                return {
                  id,
                  name: meta.name || "Unknown Group",
                  emoji: meta.emoji || "📁",
                  coverPhoto: meta.coverPhoto,
                  memberCount: meta.memberCount || 0,
                  createdBy: meta.createdBy,
                  createdAt: meta.createdAt || new Date().toISOString(),
                  isPersonal: meta.isPersonal || false,
                  members: [] // Empty members initially - will be lazy loaded on demand
                } as Group;
              });

              // --- NEW: Check for Personal Space (Migration) ---
              if (newGroups.length === 0 || !newGroups.some(g => g.isPersonal)) {
                console.log('✨ No Personal Space found - triggering auto-creation');
                const personalGroupId = `personal_${user.uid}`;

                // We run this in the background, the listener will pick it up
                const personalGroup = {
                  id: personalGroupId,
                  name: "Personal Space",
                  emoji: "👤",
                  isPersonal: true,
                  members: [{
                    id: user.uid,
                    name: "You",
                    userId: user.uid,
                    isAdmin: true
                  }],
                  createdBy: user.uid,
                  createdAt: new Date().toISOString()
                };

                // Push to DB
                set(ref(database, `groups/${personalGroupId}`), personalGroup);
                set(ref(database, `userGroups/${user.uid}/${personalGroupId}`), {
                  name: "Personal Space",
                  emoji: "👤",
                  isPersonal: true,
                  memberCount: 1,
                  role: 'admin',
                  createdAt: personalGroup.createdAt
                });
              }
              // ------------------------------------------------

              return newGroups.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            });

            setIsLoading(false);

          } catch (error: any) {
            logger.error("Error in groups listener", { uid: user.uid, error: error.message });
            setIsLoading(false);
          }
        }, (error) => {
          logger.error("Groups listener error", { uid: user.uid, error: error.message });
          setIsLoading(false);
        });

        // Listen to user's transactions with error handling
        // OPTIMIZATION: Limit to last 100 transactions to prevent slow startup
        const transactionsRef = query(ref(database, `userTransactions/${user.uid}`), limitToLast(100));
        const transactionsListener = onValue(transactionsRef, async (snapshot) => {
          try {
            if (snapshot.exists()) {
              const userTransactions = snapshot.val();
              const transactionPromises = Object.entries(userTransactions).map(async ([id, data]: [string, any]) => {
                // OPTIMIZATION: Check if we have enough data in the summary to avoid N+1 fetch

                if (data && data.type === 'expense' && Array.isArray(data.participants) && data.participants.length > 0) {
                  return {
                    id,
                    ...data,
                    date: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : (data.date || "Unknown Date")
                  };
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
                  return {
                    id,
                    ...data,
                    date: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : (data.date || "Unknown Date")
                  };
                }

                // 3. For wallet ops, summary is sufficient
                if (data && (data.type === 'wallet_add' || data.type === 'wallet_deduct')) {
                  return {
                    id,
                    ...data,
                    date: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : (data.date || "Unknown Date")
                  };
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
    members: { name: string; paymentDetails?: PaymentDetails; phone?: string; email?: string }[];
    invitedUsernames?: string[]; // New: List of usernames to invite
    invitedEmails?: string[]; // New: List of emails to invite
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

      const sanitizedMembers = data.members.map(m => {
        const memberObj: any = {
          name: m.name.trim().substring(0, 50),
          paymentDetails: m.paymentDetails || {},
          phone: m.phone ? m.phone.trim().substring(0, 20) : null,
        };

        if (m.email) {
          memberObj.email = m.email.trim();
          memberObj.isPending = true;
          memberObj.invitedAt = new Date().toISOString();
        }

        return memberObj;
      });

      const newGroup: Partial<Group> = {
        id: groupId,
        name: data.name.trim().substring(0, 50),
        emoji: data.emoji.trim().substring(0, 10),
        members: [
          {
            id: user.uid,
            name: "You",
            // isCurrentUser: true, // Don't persist this - computed client-side only
            paymentDetails: user.paymentDetails || {},
            phone: user.phone || null,
            userId: user.uid,
          },
          ...sanitizedMembers.map((m: any) => ({
            id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            name: m.name,
            paymentDetails: m.paymentDetails,
            phone: m.phone,
            email: m.email,
            isPending: m.isPending,
            invitedAt: m.invitedAt
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
      if (result.success) {
        // Handle Usernames
        if (data.invitedUsernames && data.invitedUsernames.length > 0) {
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

        // Handle Emails
        if (data.invitedEmails && data.invitedEmails.length > 0) {
          (async () => {
            await Promise.all(data.invitedEmails!.map(async (email) => {
              try {
                await sendExternalInvitation(groupId, email);
              } catch (invError) {
                console.error(`Failed to invite email ${email}:`, invError);
              }
            }));
          })();
        }
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
          // Use new secure endpoint that constructs email on server
          // callSecureApi ensures we are authenticated
          await callSecureApi('/api/send-temp-member-alert', {
            memberName: newMember.name,
            groupName: group.name,
            expiryDate: new Date(newMember.expiresAt!).toLocaleDateString()
          });
        } catch (e) {
          console.error("Error sending email", e);
        }
      }

      const updatedMembers = [...group.members, newMember];

      // Optimistic local update to ensure validation passes immediately
      setGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return { ...g, members: updatedMembers };
        }
        return g;
      }));

      // Use push for optimized add - this is much more efficient than rewriting the whole array
      const membersRef = ref(database, `groups/${groupId}/members`);
      await retryOperation(() => Promise.resolve(push(membersRef, newMember)));

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
      // Quick client-side check for unsettled debts
      const settlements = getSettlements(groupId);
      const memberSettlement = settlements[memberId] || { toReceive: 0, toPay: 0 };
      const hasDebt = memberSettlement.toReceive > 0 || memberSettlement.toPay > 0;
      if (hasDebt) {
        return { success: false, error: "Cannot remove a member with unsettled debts in this group" };
      }

      const result = await callSecureApi('/api/remove-member', { groupId, memberId });

      if (result.success) {
        // Optimistic local state cleanup — remove member from group immediately
        setGroups(prev => prev.map(g => {
          if (g.id === groupId) {
            return { ...g, members: g.members.filter(m => m.id !== memberId) };
          }
          return g;
        }));
      }

      return { success: result.success, error: result.error };
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
      const errorMessage = error.message || "";
      const isNetworkError = !navigator.onLine ||
        errorMessage.toLowerCase().includes('fetch') ||
        errorMessage.toLowerCase().includes('network') ||
        errorMessage.includes('auth/network-request-failed');

      if (isNetworkError) {
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

      // Fallback to offline if API call fails due to network
      const errorMessage = error.message || "";
      const isNetworkError = !navigator.onLine ||
        errorMessage.toLowerCase().includes('fetch') ||
        errorMessage.toLowerCase().includes('network') ||
        errorMessage.includes('auth/network-request-failed');

      if (isNetworkError) {
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
          return { success: true, error: "Network error: saved to sync later" };
        } catch (offlineError) {
          console.error("Failed to save offline payment", offlineError);
        }
      }

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
      const result = await callSecureApi('/api/update-group', {
        groupId,
        name: data.name,
        emoji: data.emoji
      });
      return { success: result.success, error: result.error };
    } catch (error: any) {
      console.error("Update group error:", error);
      return { success: false, error: error.message || "Failed to update group" };
    }
  };

  const deleteGroup = async (groupId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      // Quick client-side check for pending settlements
      const settlements = getSettlements(groupId);
      const hasPendingSettlements = Object.values(settlements).some((settlement: any) =>
        settlement.toReceive > 0 || settlement.toPay > 0
      );
      if (hasPendingSettlements) {
        return { success: false, error: "Cannot delete group with pending settlements. Please settle all debts first." };
      }

      const result = await callSecureApi('/api/delete-group', { groupId });

      if (result.success) {
        // Optimistic local state cleanup — remove immediately so UI doesn't show stale "Unknown Group"
        setGroups(prev => prev.filter(g => g.id !== groupId));
        setTransactions(prev => prev.filter(t => t.groupId !== groupId));
      }

      return { success: result.success, error: result.error };
    } catch (error: any) {
      console.error("Delete group error:", error);
      return { success: false, error: error.message || "Failed to delete group" };
    }
  };

  const mergeMembers = async (groupId: string, fromMemberId: string, toMemberId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };
    if (fromMemberId === toMemberId) return { success: false, error: "Cannot merge member into themselves" };

    try {
      const result = await callSecureApi('/api/merge-members', { groupId, fromMemberId, toMemberId });
      return { success: result.success, error: result.error };
    } catch (error: any) {
      console.error("Merge members error:", error);
      return { success: false, error: error.message || "Failed to merge members" };
    }
  };

  const claimMemberProfile = async (groupId: string, memberId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return { success: false, error: "Group not found" };

      const member = group.members.find(m => m.id === memberId);
      if (!member) return { success: false, error: "Member not found" };

      if (member.userId) return { success: false, error: "This profile finishes already claimed" };

      const memberIndex = group.members.findIndex(m => m.id === memberId);
      if (memberIndex === -1) return { success: false, error: "Member not found" };

      // Update member details
      const updatedMembers = [...group.members];
      updatedMembers[memberIndex] = {
        ...member,
        userId: user.uid,
        name: user.name || member.name, // Use auth name
        email: user.email,
        photoURL: user.photoURL,
        isTemporary: false, // No longer temporary
        deletionCondition: null,
        expiresAt: null
      };

      await set(ref(database, `groups/${groupId}/members`), updatedMembers);

      // Add user to group list
      await set(ref(database, `userGroups/${user.uid}/${groupId}`), {
        joinedAt: new Date().toISOString(),
        memberCount: updatedMembers.length
      });

      return { success: true };
    } catch (error: any) {
      console.error("Claim profile error:", error);
      return { success: false, error: error.message || "Failed to claim profile" };
    }
  };

  const claimEmailInvite = async (groupId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated" };

    try {
      const result = await callSecureApi('/api/claim-email-invite', { groupId });

      if (!result.success) {
        return { success: false, error: result.error || "Failed to claim invitation" };
      }

      // Refresh groups after claiming (listeners will handle this automatically)
      return { success: true };
    } catch (error: any) {
      console.error("Claim email invite error:", error);
      return { success: false, error: error.message || "Failed to join group" };
    }
  };

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
        rollback: async () => { },
        description: "Delete user groups index"
      });

      // 3. Delete User Transactions
      transaction.addOperation({
        execute: async () => {
          const userTransactionsRef = ref(database, `userTransactions/${user.uid}`);
          await retryOperation(() => remove(userTransactionsRef));
          return true;
        },
        rollback: async () => { },
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
          rollback: async () => { },
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
        rollback: async () => { },
        description: "Delete email verification"
      });

      // 6. Delete User Profile
      transaction.addOperation({
        execute: async () => {
          const userRef = ref(database, `users/${user.uid}`);
          await retryOperation(() => remove(userRef));
          return true;
        },
        rollback: async () => { },
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
    mergeMembers,
    claimMemberProfile,
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
    claimEmailInvite
  }), [
    groups,
    transactions,
    isLoading,
    user?.uid,
    fetchGroupDetail,
    claimEmailInvite
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
