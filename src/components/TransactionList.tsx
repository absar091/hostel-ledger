import { useMemo, memo } from "react";
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

export const TransactionList = memo(({
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
            formatAmount={formatAmount}
            dateFormat={dateFormat}
          />
        ))}
      </div>
    </div>
  );
});

TransactionList.displayName = 'TransactionList';
