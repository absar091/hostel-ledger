import { openDB, DBSchema, IDBPDatabase } from "idb";

// Define the database schema
interface HostelLedgerDB extends DBSchema {
  "offline-expenses": {
    key: string;
    value: OfflineExpense;
    indexes: { "by-timestamp": number; "by-group": string };
  };
  "cached-groups": {
    key: string;
    value: any;
  };
  "cached-transactions": {
    key: string;
    value: any;
    indexes: { "by-group": string };
  };
  "app-data": {
    key: string;
    value: any;
  };
}

export interface OfflineExpense {
  id: string;
  groupId: string;
  amount: number;
  paidBy: string;
  participants: string[];
  note: string;
  place: string;
  timestamp: number;
  createdOffline: boolean;
  syncAttempts?: number;
  lastSyncAttempt?: number;
}

let dbInstance: IDBPDatabase<HostelLedgerDB> | null = null;

// Initialize database with enhanced schema
export const initDB = async (): Promise<IDBPDatabase<HostelLedgerDB>> => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<HostelLedgerDB>("hostel-ledger-db", 2, {
    upgrade(db, oldVersion) {
      // Offline expenses store
      if (!db.objectStoreNames.contains("offline-expenses")) {
        const store = db.createObjectStore("offline-expenses", { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
        store.createIndex("by-group", "groupId");
      }

      // Cached groups store (NEW)
      if (!db.objectStoreNames.contains("cached-groups")) {
        db.createObjectStore("cached-groups", { keyPath: "id" });
      }

      // Cached transactions store (NEW)
      if (!db.objectStoreNames.contains("cached-transactions")) {
        const txStore = db.createObjectStore("cached-transactions", { keyPath: "id" });
        txStore.createIndex("by-group", "groupId");
      }

      // App data store for misc cached data (NEW)
      if (!db.objectStoreNames.contains("app-data")) {
        db.createObjectStore("app-data", { keyPath: "key" });
      }
    },
  });

  return dbInstance;
};

// Save expense offline
export const saveOfflineExpense = async (expense: Omit<OfflineExpense, "id" | "timestamp" | "createdOffline">): Promise<string> => {
  const db = await initDB();
  
  const offlineExpense: OfflineExpense = {
    ...expense,
    id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    timestamp: Date.now(),
    createdOffline: true,
    syncAttempts: 0,
  };

  await db.put("offline-expenses", offlineExpense);
  return offlineExpense.id;
};

// Get all offline expenses
export const getOfflineExpenses = async (): Promise<OfflineExpense[]> => {
  const db = await initDB();
  return await db.getAll("offline-expenses");
};

// Get offline expenses by group
export const getOfflineExpensesByGroup = async (groupId: string): Promise<OfflineExpense[]> => {
  const db = await initDB();
  return await db.getAllFromIndex("offline-expenses", "by-group", groupId);
};

// Delete offline expense
export const deleteOfflineExpense = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete("offline-expenses", id);
};

// Update sync attempt
export const updateSyncAttempt = async (id: string): Promise<void> => {
  const db = await initDB();
  const expense = await db.get("offline-expenses", id);
  
  if (expense) {
    expense.syncAttempts = (expense.syncAttempts || 0) + 1;
    expense.lastSyncAttempt = Date.now();
    await db.put("offline-expenses", expense);
  }
};

// Clear all offline expenses (use with caution)
export const clearAllOfflineExpenses = async (): Promise<void> => {
  const db = await initDB();
  await db.clear("offline-expenses");
};

// Get count of pending offline expenses
export const getOfflineExpenseCount = async (): Promise<number> => {
  const db = await initDB();
  return await db.count("offline-expenses");
};

// ============================================
// CACHED GROUPS FUNCTIONS
// ============================================

export const cacheGroups = async (groups: any[]): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction("cached-groups", "readwrite");
  
  // Clear existing groups
  await tx.store.clear();
  
  // Add all groups
  for (const group of groups) {
    await tx.store.put(group);
  }
  
  await tx.done;
  console.log('✅ Cached', groups.length, 'groups to IndexedDB');
};

export const getCachedGroups = async (): Promise<any[]> => {
  const db = await initDB();
  const groups = await db.getAll("cached-groups");
  console.log('📦 Retrieved', groups.length, 'cached groups from IndexedDB');
  return groups;
};

// ============================================
// CACHED TRANSACTIONS FUNCTIONS
// ============================================

export const cacheTransactions = async (transactions: any[]): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction("cached-transactions", "readwrite");
  
  // Clear existing transactions
  await tx.store.clear();
  
  // Add all transactions
  for (const transaction of transactions) {
    await tx.store.put(transaction);
  }
  
  await tx.done;
  console.log('✅ Cached', transactions.length, 'transactions to IndexedDB');
};

export const getCachedTransactions = async (): Promise<any[]> => {
  const db = await initDB();
  const transactions = await db.getAll("cached-transactions");
  console.log('📦 Retrieved', transactions.length, 'cached transactions from IndexedDB');
  return transactions;
};

export const getCachedTransactionsByGroup = async (groupId: string): Promise<any[]> => {
  const db = await initDB();
  return await db.getAllFromIndex("cached-transactions", "by-group", groupId);
};

// ============================================
// APP DATA FUNCTIONS (for misc cached data)
// ============================================

export const setAppData = async (key: string, value: any): Promise<void> => {
  const db = await initDB();
  await db.put("app-data", { key, value, timestamp: Date.now() });
};

export const getAppData = async (key: string): Promise<any> => {
  const db = await initDB();
  const data = await db.get("app-data", key);
  return data?.value;
};

// ============================================
// CACHE STATUS
// ============================================

export const getCacheStatus = async (): Promise<{
  hasGroups: boolean;
  hasTransactions: boolean;
  hasUser: boolean;
  groupCount: number;
  transactionCount: number;
}> => {
  const db = await initDB();
  const groupCount = await db.count("cached-groups");
  const transactionCount = await db.count("cached-transactions");
  const cachedUser = localStorage.getItem('cachedUser');
  
  return {
    hasGroups: groupCount > 0,
    hasTransactions: transactionCount > 0,
    hasUser: !!cachedUser,
    groupCount,
    transactionCount,
  };
};
