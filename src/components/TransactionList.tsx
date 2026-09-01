import { useMemo, useState, useCallback } from "react";
import ExpenseThreadSheet from "./ExpenseThreadSheet";
import { type Transaction, type Group } from "@/contexts/FirebaseDataContext";
import { TransactionItem } from "./TransactionItem";
import { cn } from "@/lib/utils";

interface TransactionListProps {
  title?: string;
  transactions: Transaction[];
  groups: Group[];
  userId?: string;
  onSelectTransaction: (transaction: Transaction) => void;
  formatAmount: (amount: number) => string;
  showSeparator?: boolean;
  dateFormat?: "time" | "date";
}

export const TransactionList = ({
  title,
  transactions,
  groups,
  userId,
  onSelectTransaction,
  formatAmount,
  showSeparator = false,
  dateFormat = "time",
}: TransactionListProps) => {
  // Memoize group lookup map to O(1) access
  // ⚡ Bolt Optimization: Lifted overlay state to prevent rendering Modals inside mapped items.
  // Expected Impact: Prevents massive DOM bloat/memory issues.
  const [chatTransaction, setChatTransaction] = useState<Transaction | null>(null);

  // ⚡ Bolt Optimization: Memoized callback to prevent breaking React.memo on TransactionItems
  // Expected Impact: Prevents unnecessary re-renders of list items.
  const handleOpenChat = useCallback((transaction: Transaction) => {
    setChatTransaction(transaction);
  }, []);

  const groupMap = useMemo(() => {
    return groups.reduce((acc, group) => {
      acc[group.id] = group.name;
      return acc;
    }, {} as Record<string, string>);
  }, [groups]);

  if (transactions.length === 0) return null;

  return (
    <div className="mb-4 lg:mb-6 last:mb-0">
      {title && (
        <div
          className={cn(
            "px-3 py-2 lg:px-4 lg:py-2",
            showSeparator && "border-t border-slate-100 dark:border-slate-800"
          )}
        >
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
            {title}
          </h4>
        </div>
      )}
      <div className="space-y-1">
        {transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            groupName={groupMap[transaction.groupId]}
            userId={userId}
            onClick={onSelectTransaction}
            onOpenChat={handleOpenChat}
            formatAmount={formatAmount}
            dateFormat={dateFormat}
          />
        ))}
      </div>

      <ExpenseThreadSheet
        isOpen={!!chatTransaction}
        onClose={() => setChatTransaction(null)}
        groupId={chatTransaction?.groupId || ""}
        groupName={chatTransaction?.groupId ? groupMap[chatTransaction.groupId] || "Group" : "Group"}
        expenseId={chatTransaction?.id || ""}
        expenseTitle={chatTransaction?.title || ""}
      />
    </div>
  );
};
