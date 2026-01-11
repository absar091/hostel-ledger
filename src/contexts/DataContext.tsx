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
  type: "expense" | "payment";
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
  createdAt: string;
}

interface DataContextType {
  groups: Group[];
  transactions: Transaction[];
  createGroup: (data: { name: string; emoji: string; members: { name: string; paymentDetails?: PaymentDetails; phone?: string }[] }) => Group;
  updateGroup: (groupId: string, data: Partial<Group>) => void;
  deleteGroup: (groupId: string) => void;
  addMemberToGroup: (groupId: string, member: { name: string; paymentDetails?: PaymentDetails; phone?: string }) => void;
  updateMemberPaymentDetails: (groupId: string, memberId: string, paymentDetails: PaymentDetails, phone?: string) => void;
  addExpense: (data: { groupId: string; amount: number; paidBy: string; participants: string[]; note: string; place: string }) => void;
  recordPayment: (data: { groupId: string; fromMember: string; toMember: string; amount: number; method: "cash" | "online"; note?: string }) => void;
  getGroupById: (groupId: string) => Group | undefined;
  getTransactionsByGroup: (groupId: string) => Transaction[];
  getTransactionsByMember: (groupId: string, memberId: string) => Transaction[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const GROUPS_KEY = "hostel_wallet_groups";
const TRANSACTIONS_KEY = "hostel_wallet_transactions";

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
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

  // Save data to localStorage
  const saveGroups = (newGroups: Group[]) => {
    if (user) {
      localStorage.setItem(`${GROUPS_KEY}_${user.id}`, JSON.stringify(newGroups));
    }
    setGroups(newGroups);
  };

  const saveTransactions = (newTransactions: Transaction[]) => {
    if (user) {
      localStorage.setItem(`${TRANSACTIONS_KEY}_${user.id}`, JSON.stringify(newTransactions));
    }
    setTransactions(newTransactions);
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

  const addExpense = (data: { groupId: string; amount: number; paidBy: string; participants: string[]; note: string; place: string }) => {
    const group = groups.find((g) => g.id === data.groupId);
    if (!group) return;

    const payer = group.members.find((m) => m.id === data.paidBy);
    const participantMembers = group.members.filter((m) => data.participants.includes(m.id));
    const splitAmount = Math.round(data.amount / participantMembers.length);

    // Create transaction
    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      groupId: data.groupId,
      type: "expense",
      title: data.note || "Expense",
      amount: data.amount,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      paidBy: data.paidBy,
      paidByName: payer?.name || "Unknown",
      participants: participantMembers.map((m) => ({
        id: m.id,
        name: m.name,
        amount: splitAmount,
      })),
      place: data.place,
      note: data.note,
      createdAt: new Date().toISOString(),
    };

    saveTransactions([newTransaction, ...transactions]);

    // Update balances
    const updatedGroups = groups.map((g) => {
      if (g.id === data.groupId) {
        return {
          ...g,
          members: g.members.map((m) => {
            if (m.id === data.paidBy) {
              // Payer gets credit for others' shares
              const othersShare = participantMembers
                .filter((p) => p.id !== data.paidBy)
                .length * splitAmount;
              return { ...m, balance: m.balance + othersShare };
            } else if (data.participants.includes(m.id)) {
              // Participants owe the payer
              return { ...m, balance: m.balance - splitAmount };
            }
            return m;
          }),
        };
      }
      return g;
    });
    saveGroups(updatedGroups);
  };

  const recordPayment = (data: { groupId: string; fromMember: string; toMember: string; amount: number; method: "cash" | "online"; note?: string }) => {
    const group = groups.find((g) => g.id === data.groupId);
    if (!group) return;

    const fromPerson = group.members.find((m) => m.id === data.fromMember);
    const toPerson = group.members.find((m) => m.id === data.toMember);

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      groupId: data.groupId,
      type: "payment",
      title: "Payment",
      amount: data.amount,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
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

    // Update balances
    const updatedGroups = groups.map((g) => {
      if (g.id === data.groupId) {
        return {
          ...g,
          members: g.members.map((m) => {
            if (m.id === data.fromMember) {
              return { ...m, balance: m.balance + data.amount };
            } else if (m.id === data.toMember) {
              return { ...m, balance: m.balance - data.amount };
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

  return (
    <DataContext.Provider
      value={{
        groups,
        transactions,
        createGroup,
        updateGroup,
        deleteGroup,
        addMemberToGroup,
        updateMemberPaymentDetails,
        addExpense,
        recordPayment,
        getGroupById,
        getTransactionsByGroup,
        getTransactionsByMember,
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
