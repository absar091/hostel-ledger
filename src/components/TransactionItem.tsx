import { memo } from "react";
import { ArrowUpRight, ArrowDownLeft, CreditCard } from "@/lib/icons";
import { type Transaction } from "@/contexts/FirebaseDataContext";
import { cn } from "@/lib/utils";

interface TransactionItemProps {
  transaction: Transaction;
  groupName?: string;
  userId?: string;
  onClick: (transaction: Transaction) => void;
  formatAmount: (amount: number) => string;
  dateFormat?: "time" | "date";
}

export const TransactionItem = memo(({
  transaction,
  groupName,
  userId,
  onClick,
  formatAmount,
  dateFormat = "time",
}: TransactionItemProps) => {
  const isPayer = transaction.paidBy === userId;
  const userParticipant = transaction.participants?.find(
    (p) => p.id === userId
  );
  const isParticipant = !!userParticipant;

  const typeLabel =
    transaction.type === "expense"
      ? isPayer
        ? "You paid"
        : isParticipant
        ? "You owe"
        : "Group expense"
      : transaction.type === "payment"
      ? transaction.paidBy === userId || transaction.from === userId
        ? "Payment sent"
        : "Payment received"
      : "Wallet";

  const displayAmount =
    transaction.type === "expense"
      ? isPayer
        ? transaction.amount
        : isParticipant
        ? (userParticipant?.amount ?? 0)
        : 0
      : transaction.amount;

  const extraDescription =
    transaction.type === "expense"
      ? isPayer
        ? "Paid by you"
        : isParticipant
        ? "You owe"
        : "Not involved"
      : transaction.paidBy === userId || transaction.from === userId
      ? "Sent"
      : "Received";

  const dateDisplay =
    dateFormat === "date"
      ? transaction.date
      : new Date(
          transaction.timestamp || transaction.date
        ).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

  return (
    <button
      onClick={() => onClick(transaction)}
      className="w-full flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl lg:rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:scale-[1.01] active:scale-[0.99] transition-all text-left group"
    >
      <div
        className={cn(
          "w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl flex items-center justify-center transition-colors",
          transaction.type === "expense"
            ? "bg-rose-50 dark:bg-rose-900/20 text-rose-500"
            : "bg-blue-50 dark:bg-blue-900/20 text-blue-500"
        )}
      >
        {transaction.type === "expense" ? (
          <ArrowUpRight className="w-4 h-4 lg:w-5 lg:h-5" />
        ) : transaction.type === "payment" ? (
          <ArrowDownLeft className="w-4 h-4 lg:w-5 lg:h-5" />
        ) : (
          <CreditCard className="w-4 h-4 lg:w-5 lg:h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm lg:text-base text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
          {transaction.title}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {typeLabel}
          {groupName && ` • ${groupName}`}
          {" • "}
          {dateDisplay}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className={cn(
            "font-black text-sm lg:text-base tabular-nums",
            transaction.type === "expense"
              ? isPayer || isParticipant
                ? "text-rose-500"
                : "text-slate-400"
              : "text-slate-900 dark:text-white"
          )}
        >
          {transaction.type === "expense" && !isPayer && !isParticipant
            ? "-"
            : formatAmount(displayAmount)}
        </p>
        <p className="hidden lg:block text-xs text-slate-400">
          {extraDescription}
        </p>
      </div>
    </button>
  );
});

TransactionItem.displayName = "TransactionItem";
