import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth, PaymentDetails } from "./AuthContext";

export interface GroupMember {
  id: string;
  name: string;
  isCurrentUser?: boolean;
  balance: number; // positive = they owe you, negative = you owe them
  paymentDetails?: PaymentDetails;
  phone?: string;
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
  paidBy: string; // member id
  paidByName: string;
  participants?: { id: string; name: string; amount: number }[];
  from?: string;
  fromName?: string;
  to?: string;
  toName?: string;
  method?: "cash" | "online";
  place?: string;
  note?: string;
  walletBalanceBefore?: number; // Track wallet balance before transaction
  walletBalanceAfter?: number; // Track wallet balance after transaction
  createdAt: string;
}

interface DataContextType {
  groups: Group[];
  transactions: Transaction[];
  createGroup: (data: { name: string; emoji: string; members: { name: string; paymentDetails?: PaymentDetails; phone?: string }[] }) => Group;
  updateGroup: (groupId: string, data: Partial<Group>) => void;
  deleteGroup: (groupId: string) => void;
  addMemberToGroup: (groupId: string, member: { name: string; paymentDetails?: PaymentDetails; phone?: string }) => void;
  removeMemberFromGroup: (groupId: string, memberId: string) => void;
  updateMemberPaymentDetails: (groupId: string, memberId: string, paymentDetails: PaymentDetails, phone?: string) => void;
  addExpense: (data: { groupId: string; amount: number; paidBy: string; participants: string[]; note: string; place: string }) => { success: boolean; error?: string };
  recordPayment: (data: { groupId: string; fromMember: string; toMember: string; amount: number; method: "cash" | "online"; note?: string }) => void;
  markPaymentAsPaid: (groupId: string, toMember: string, amount: number) => { success: boolean; error?: string };
  addMoneyToWallet: (amount: number, note?: string) => void;
  getGroupById: (groupId: string) => Group | undefined;
  getTransactionsByGroup: (groupId: string) => Transaction[];
  getTransactionsByMember: (groupId: string, memberId: string) => Transaction[];
  getAllTransactions: () => Transaction[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const GROUPS_KEY = "hostel_wallet_groups";
const TRANSACTIONS_KEY = "hostel_wallet_transactions";

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user, addMoneyToWallet: addToAuthWallet, deductMoneyFromWallet, getWalletBalance } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load data from localStorage
  useEffect(() => {
    if (user) {
      const savedGroups = localStorage.getItem(`${GROUPS_KEY}_${user.id}`);
      const savedTransactions = localStorage.getItem(`${TRANSACTIONS_KEY}_${user.id}`);
      
      setGroups(savedGroups ? JSON.parse(savedGroups) : []);
      setTransactions(savedTransactions ? JSON.parse(savedTransactions) : []);
    } else {
      setGroups([]);
      setTransactions([]);
    }
  }, [user]);

  // Save data to localStorage with error handling
  const saveGroups = (newGroups: Group[]) => {
    if (user) {
      try {
        localStorage.setItem(`${GROUPS_KEY}_${user.id}`, JSON.stringify(newGroups));
        setGroups(newGroups);
      } catch (error) {
        console.error("Failed to save groups to localStorage:", error);
        // Keep the in-memory state but warn user
      }
    } else {
      setGroups(newGroups);
    }
  };

  const saveTransactions = (newTransactions: Transaction[]) => {
    if (user) {
      try {
        localStorage.setItem(`${TRANSACTIONS_KEY}_${user.id}`, JSON.stringify(newTransactions));
        setTransactions(newTransactions);
      } catch (error) {
        console.error("Failed to save transactions to localStorage:", error);
        // Keep the in-memory state but warn user
      }
    } else {
      setTransactions(newTransactions);
    }
  };

  const createGroup = (data: { name: string; emoji: string; members: { name: string; paymentDetails?: PaymentDetails; phone?: string }[] }): Group => {
    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: data.name,
      emoji: data.emoji,
      members: [
        {
          id: user?.id || "current-user",
          name: "You",
          isCurrentUser: true,
          balance: 0,
          paymentDetails: user?.paymentDetails,
          phone: user?.phone,
        },
        ...data.members.map((m) => ({
          id: crypto.randomUUID(),
          name: m.name,
          balance: 0,
          paymentDetails: m.paymentDetails,
          phone: m.phone,
        })),
      ],
      createdBy: user?.id || "current-user",
      createdAt: new Date().toISOString(),
    };

    saveGroups([...groups, newGroup]);
    return newGroup;
  };

  const updateGroup = (groupId: string, data: Partial<Group>) => {
    const updatedGroups = groups.map((g) =>
      g.id === groupId ? { ...g, ...data } : g
    );
    saveGroups(updatedGroups);
  };

  const deleteGroup = (groupId: string) => {
    saveGroups(groups.filter((g) => g.id !== groupId));
    saveTransactions(transactions.filter((t) => t.groupId !== groupId));
  };

  const addMemberToGroup = (groupId: string, member: { name: string; paymentDetails?: PaymentDetails; phone?: string }) => {
    const updatedGroups = groups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          members: [
            ...g.members,
            {
              id: crypto.randomUUID(),
              name: member.name,
              balance: 0,
              paymentDetails: member.paymentDetails,
              phone: member.phone,
            },
          ],
        };
      }
      return g;
    });
    saveGroups(updatedGroups);
  };

  const removeMemberFromGroup = (groupId: string, memberId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const memberToRemove = group.members.find((m) => m.id === memberId);
    if (!memberToRemove) return;

    // Check if member has outstanding balance
    if (memberToRemove.balance !== 0) {
      console.warn(`Removing member ${memberToRemove.name} with outstanding balance: Rs ${memberToRemove.balance}`);
    }

    // Remove member from group
    const updatedGroups = groups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          members: g.members.filter((m) => m.id !== memberId),
        };
      }
      return g;
    });
    saveGroups(updatedGroups);

    // Mark transactions involving this member (keep for history but mark as archived)
    const updatedTransactions = transactions.map((t) => {
      if (t.groupId === groupId) {
        const memberInvolved = 
          t.paidBy === memberId || 
          t.from === memberId || 
          t.to === memberId ||
          t.participants?.some((p) => p.id === memberId);
        
        if (memberInvolved) {
          return {
            ...t,
            note: t.note ? `${t.note} [Member removed: ${memberToRemove.name}]` : `[Member removed: ${memberToRemove.name}]`
          };
        }
      }
      return t;
    });
    saveTransactions(updatedTransactions);
  };

  const updateMemberPaymentDetails = (groupId: string, memberId: string, paymentDetails: PaymentDetails, phone?: string) => {
    const updatedGroups = groups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          members: g.members.map((m) =>
            m.id === memberId ? { ...m, paymentDetails, phone: phone || m.phone } : m
          ),
        };
      }
      return g;
    });
    saveGroups(updatedGroups);
  };

  const addExpense = (data: { groupId: string; amount: number; paidBy: string; participants: string[]; note: string; place: string }): { success: boolean; error?: string } => {
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

    if (participantMembers.length !== data.participants.length) {
      return { success: false, error: "Some participants not found in group" };
    }

    // Check if current user is the payer and has sufficient wallet balance
    const isCurrentUserPayer = payer.isCurrentUser;
    if (isCurrentUserPayer) {
      const currentUserParticipantIndex = participantMembers.findIndex(p => p.isCurrentUser);
      const userShare = currentUserParticipantIndex >= 0 ? 
        Math.floor(data.amount / participantMembers.length) + (currentUserParticipantIndex < (data.amount % participantMembers.length) ? 1 : 0) : 0;
      
      const walletBalance = getWalletBalance();
      if (walletBalance < userShare) {
        return { success: false, error: `Insufficient wallet balance. You need Rs ${userShare} but have Rs ${walletBalance}` };
      }
    }

    // Check for duplicate transactions (same amount, payer, participants within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentDuplicate = transactions.find((t) => 
      t.groupId === data.groupId &&
      t.type === "expense" &&
      t.amount === data.amount &&
      t.paidBy === data.paidBy &&
      new Date(t.createdAt) > fiveMinutesAgo &&
      t.participants?.length === data.participants.length &&
      t.participants?.every((p) => data.participants.includes(p.id))
    );

    if (recentDuplicate) {
      return { success: false, error: "Duplicate transaction detected" };
    }

    // Calculate split amounts with proper rounding
    const baseAmount = Math.floor(data.amount / participantMembers.length);
    const remainder = data.amount % participantMembers.length;
    
    // Distribute remainder to first few participants
    const splitAmounts = participantMembers.map((_, index) => 
      baseAmount + (index < remainder ? 1 : 0)
    );

    // If current user is payer, deduct their share from wallet
    if (isCurrentUserPayer) {
      const currentUserParticipantIndex = participantMembers.findIndex(p => p.isCurrentUser);
      const userShare = currentUserParticipantIndex >= 0 ? splitAmounts[currentUserParticipantIndex] : 0;
      
      const deductionSuccess = deductMoneyFromWallet(userShare);
      if (!deductionSuccess) {
        return { success: false, error: "Failed to deduct money from wallet" };
      }
    }

    // Create transaction
    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
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
      paidByName: payer?.name || "Unknown",
      participants: participantMembers.map((m, index) => ({
        id: m.id,
        name: m.name,
        amount: splitAmounts[index],
      })),
      place: data.place,
      note: data.note,
      walletBalanceAfter: isCurrentUserPayer ? getWalletBalance() : undefined,
      createdAt: new Date().toISOString(),
    };

    saveTransactions([newTransaction, ...transactions]);

    // Update balances - FIXED LOGIC
    const updatedGroups = groups.map((g) => {
      if (g.id === data.groupId) {
        return {
          ...g,
          members: g.members.map((m) => {
            if (m.id === data.paidBy) {
              // Payer gets credit for others' shares only (not their own)
              const payerParticipantIndex = participantMembers.findIndex(p => p.id === data.paidBy);
              const payerShare = payerParticipantIndex >= 0 ? splitAmounts[payerParticipantIndex] : 0;
              const othersTotal = data.amount - payerShare;
              return { ...m, balance: m.balance + othersTotal };
            } else if (data.participants.includes(m.id)) {
              // Participants owe their share to the payer
              const participantIndex = participantMembers.findIndex(p => p.id === m.id);
              const theirShare = splitAmounts[participantIndex];
              return { ...m, balance: m.balance - theirShare };
            }
            return m;
          }),
        };
      }
      return g;
    });
    saveGroups(updatedGroups);

    return { success: true };
  };

  const recordPayment = (data: { groupId: string; fromMember: string; toMember: string; amount: number; method: "cash" | "online"; note?: string }) => {
    const group = groups.find((g) => g.id === data.groupId);
    if (!group) return;

    // Validation
    if (data.fromMember === data.toMember) {
      console.error("Cannot record payment to same member");
      return;
    }
    
    if (data.amount <= 0) {
      console.error("Payment amount must be positive");
      return;
    }

    const fromPerson = group.members.find((m) => m.id === data.fromMember);
    const toPerson = group.members.find((m) => m.id === data.toMember);

    if (!fromPerson || !toPerson) {
      console.error("Invalid member IDs");
      return;
    }

    // Check for duplicate payments (same amount, members, method within last 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentDuplicate = transactions.find((t) => 
      t.groupId === data.groupId &&
      t.type === "payment" &&
      t.amount === data.amount &&
      t.from === data.fromMember &&
      t.to === data.toMember &&
      t.method === data.method &&
      new Date(t.createdAt) > twoMinutesAgo
    );

    if (recentDuplicate) {
      console.warn("Duplicate payment detected - ignoring");
      return;
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
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
      paidByName: fromPerson?.name || "Unknown",
      from: data.fromMember,
      fromName: fromPerson?.name || "Unknown",
      to: data.toMember,
      toName: toPerson?.name || "Unknown",
      method: data.method,
      note: data.note,
      createdAt: new Date().toISOString(),
    };

    saveTransactions([newTransaction, ...transactions]);

    // Update balances - FIXED LOGIC
    const updatedGroups = groups.map((g) => {
      if (g.id === data.groupId) {
        return {
          ...g,
          members: g.members.map((m) => {
            if (m.id === data.fromMember) {
              // Person paying reduces their debt (balance decreases)
              return { ...m, balance: m.balance - data.amount };
            } else if (m.id === data.toMember) {
              // Person receiving gets less owed to them (balance increases)
              return { ...m, balance: m.balance + data.amount };
            }
            return m;
          }),
        };
      }
      return g;
    });
    saveGroups(updatedGroups);
  };

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

  const markPaymentAsPaid = (groupId: string, toMember: string, amount: number): { success: boolean; error?: string } => {
    if (!user) return { success: false, error: "User not logged in" };

    const walletBalance = getWalletBalance();
    if (walletBalance < amount) {
      return { success: false, error: `Insufficient wallet balance. You need Rs ${amount} but have Rs ${walletBalance}` };
    }

    // Deduct from wallet
    const deductionSuccess = deductMoneyFromWallet(amount);
    if (!deductionSuccess) {
      return { success: false, error: "Failed to deduct money from wallet" };
    }

    // Record the payment transaction
    recordPayment({
      groupId,
      fromMember: user.id,
      toMember,
      amount,
      method: "online", // Assume online since it's from wallet
      note: "Paid from wallet"
    });

    return { success: true };
  };

  const addMoneyToWallet = (amount: number, note?: string) => {
    if (!user || amount <= 0) return;

    // Add to auth wallet
    addToAuthWallet(amount);

    // Create wallet transaction record
    const walletTransaction: Transaction = {
      id: crypto.randomUUID(),
      groupId: "wallet", // Special groupId for wallet transactions
      type: "wallet_add",
      title: "Money Added to Wallet",
      amount: amount,
      date: new Date().toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        year: "numeric"
      }),
      paidBy: user.id,
      paidByName: user.name,
      note: note || "Added money to wallet",
      walletBalanceAfter: getWalletBalance(),
      createdAt: new Date().toISOString(),
    };

    saveTransactions([walletTransaction, ...transactions]);
  };

  const getAllTransactions = (): Transaction[] => {
    return transactions;
  };

  return (
    <DataContext.Provider
      value={{
        groups,
        transactions,
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
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
