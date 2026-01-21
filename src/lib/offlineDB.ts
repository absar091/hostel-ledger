import { openDB, DBSchema, IDBPDatabase } from "idb";

// Define the database schema
interface HostelLedgerDB extends DBSchema {
  "offline-expenses": {
    key: string;
    value: OfflineExpense;
    indexes: { "by-timestamp": number; "by-group": string };
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

// Initialize database
export const initDB = async (): Promise<IDBPDatabase<HostelLedgerDB>> => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<HostelLedgerDB>("hostel-ledger-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("offline-expenses")) {
        const store = db.createObjectStore("offline-expenses", { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
        store.createIndex("by-group", "groupId");
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
