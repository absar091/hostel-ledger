import { memo, useState } from "react";
import { ArrowUpRight, ArrowDownLeft, CreditCard, MessageSquareText, MapPin } from "@/lib/icons";
import { type Transaction } from "@/contexts/FirebaseDataContext";
import { cn } from "@/lib/utils";
import ExpenseThreadSheet from "./ExpenseThreadSheet";
import { useTranslation } from "react-i18next";

interface TransactionItemProps {
  transaction: Transaction;
  groupName?: string;
  userId?: string;
  onClick: (transaction: Transaction) => void;
  formatAmount: (amount: number) => string;
  dateFormat?: "time" | "date";
}

// Memoized to prevent re-renders when parent list updates but item data hasn't changed
export const TransactionItem = memo(({
  transaction,
  groupName,
  userId,
  onClick,
  formatAmount,
  dateFormat = "time",
}: TransactionItemProps) => {
  const { t } = useTranslation();
  const [showChat, setShowChat] = useState(false);
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

  const ariaLabel = `${transaction.title}${groupName ? ` in ${groupName}` : ""}, ${typeLabel} ${formatAmount(displayAmount)} on ${dateDisplay}`;

  return (
    <button
      onClick={() => onClick(transaction)}
      aria-label={ariaLabel}
      className="w-full flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl lg:rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:scale-[1.01] active:scale-[0.99] transition-all text-left group"
    >
      <div
        className={cn(
          "relative w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl flex items-center justify-center transition-all shrink-0 overflow-hidden",
          transaction.location
            ? "shadow-inner border border-slate-200 dark:border-slate-700" 
            : transaction.type === "expense"
              ? "bg-rose-50 dark:bg-rose-900/20 text-rose-500"
              : "bg-blue-50 dark:bg-blue-900/20 text-blue-500"
        )}
      >
        {transaction.location ? (
          <>
            {/* Styled Map Background */}
            <div className="absolute inset-0 opacity-30" 
                 style={{ 
                   background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                   backgroundImage: 'radial-gradient(#64748b 0.5px, transparent 0.5px)',
                   backgroundSize: '10px 10px'
                 }} 
            />
            {/* Subtle grid line to feel more map-like */}
            <div className="absolute inset-0 border-b border-r border-slate-300/20" />
            
            <div className="absolute inset-0 flex items-center justify-center z-10">
               <MapPin className="w-5 h-5 lg:w-6 lg:h-6 text-rose-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in duration-300" />
            </div>
            
            {/* Small categorical icon overlay for context */}
            <div className="absolute bottom-1 right-1 w-4 h-4 lg:w-5 lg:h-5 bg-white dark:bg-slate-900 rounded-md shadow-sm flex items-center justify-center z-20 border border-slate-100 dark:border-slate-800">
              {transaction.type === "expense" ? (
                <ArrowUpRight className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-rose-500" />
              ) : (
                <ArrowDownLeft className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-blue-500" />
              )}
            </div>
          </>
        ) : (
          transaction.type === "expense" ? (
            <ArrowUpRight className="w-4 h-4 lg:w-5 lg:h-5" />
          ) : transaction.type === "payment" ? (
            <ArrowDownLeft className="w-4 h-4 lg:w-5 lg:h-5" />
          ) : (
            <CreditCard className="w-4 h-4 lg:w-5 lg:h-5" />
          )
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
      <div className="text-right flex items-center gap-3">
        <div className="flex-shrink-0">
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

        {transaction.type === "expense" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowChat(true);
            }}
            className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
            title={t('chat.discuss')}
            aria-label={t('chat.discuss')}
          >
            <MessageSquareText className="w-4 h-4 lg:w-4.5 lg:h-4.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <ExpenseThreadSheet
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        groupId={transaction.groupId}
        groupName={groupName || "Group"}
        expenseId={transaction.id}
        expenseTitle={transaction.title}
      />
    </button>
  );
});

TransactionItem.displayName = "TransactionItem";
