import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Avatar from "./Avatar";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Calendar, MapPin, CreditCard, Banknote, ArrowRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Transaction {
  id: string;
  type: "expense" | "payment" | "wallet_add" | "wallet_deduct";
  title: string;
  amount: number;
  date: string;
  place?: string;
  method?: string;
  direction: "gave" | "received";
  balanceChange: number; // positive = they owe more, negative = you owe more
}

interface SettlementInfo {
  theyOweYou: number;  // Amount they owe to you
  youOweThem: number;  // Amount you owe to them
}

interface MemberDetailSheetProps {
  open: boolean;
  onClose: () => void;
  member: {
    name: string;
    balance: number;
    paymentDetails?: {
      jazzCash?: string;
      easypaisa?: string;
      bankName?: string;
      accountNumber?: string;
      raastId?: string;
    };
    phone?: string;
  } | null;
  transactions: Transaction[];
  settlementInfo?: SettlementInfo;
  onRecordPayment: () => void;
  onPayToMember?: () => void; // New: Pay your debt to member
}

// Calculate running balances for ledger view - Track separate debts
const calculateBalanceHistory = (
  transactions: Transaction[], 
  currentTheyOweYou: number, 
  currentYouOweThem: number
) => {
  const history: { 
    transaction: Transaction; 
    theyOweYouBefore: number; 
    youOweThemBefore: number;
    theyOweYouAfter: number; 
    youOweThemAfter: number;
  }[] = [];
  
  let runningTheyOweYou = currentTheyOweYou;
  let runningYouOweThem = currentYouOweThem;
  
  // Transactions are in reverse chronological order (newest first)
  // Work backwards to calculate the balance progression
  for (const transaction of transactions) {
    const theyOweYouAfter = runningTheyOweYou;
    const youOweThemAfter = runningYouOweThem;
    
    // Calculate before balances based on transaction type
    let theyOweYouBefore = theyOweYouAfter;
    let youOweThemBefore = youOweThemAfter;
    
    if (transaction.balanceChange > 0) {
      // Positive change = they owe you more (or you owe them less)
      if (transaction.direction === "received") {
        // They owe you more (expense where you paid)
        theyOweYouBefore = theyOweYouAfter - transaction.balanceChange;
      } else {
        // You owe them less (you paid them)
        youOweThemBefore = youOweThemAfter + transaction.balanceChange;
      }
    } else if (transaction.balanceChange < 0) {
      // Negative change = they owe you less (or you owe them more)
      if (transaction.direction === "received") {
        // They owe you less (they paid you)
        theyOweYouBefore = theyOweYouAfter - transaction.balanceChange;
      } else {
        // You owe them more (expense where they paid)
        youOweThemBefore = youOweThemAfter + transaction.balanceChange;
      }
    }
    
    history.push({
      transaction,
      theyOweYouBefore,
      youOweThemBefore,
      theyOweYouAfter,
      youOweThemAfter,
    });
    
    // Move to the previous balance for next iteration
    runningTheyOweYou = theyOweYouBefore;
    runningYouOweThem = youOweThemBefore;
  }
  
  return history;
};

const MemberDetailSheet = ({ 
  open, 
  onClose, 
  member, 
  transactions,
  settlementInfo,
  onRecordPayment,
  onPayToMember
}: MemberDetailSheetProps) => {
  if (!member) return null;

  // Use settlementInfo if provided, otherwise fallback to balance
  const theyOweYou = settlementInfo?.theyOweYou || (member.balance > 0 ? member.balance : 0);
  const youOweThem = settlementInfo?.youOweThem || (member.balance < 0 ? Math.abs(member.balance) : 0);

  const balanceHistory = calculateBalanceHistory(transactions, theyOweYou, youOweThem);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white shadow-[0_25px_70px_rgba(74,104,80,0.3)] border-t-2 border-[#4a6850]/20 z-[100]">
        <SheetHeader className="flex-shrink-0 mb-6 bg-gradient-to-r from-[#4a6850]/5 to-[#3d5643]/5 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-3xl border-b border-[#4a6850]/10">
          <SheetTitle className="text-center text-gray-900 font-black text-xl tracking-tight">Balance History</SheetTitle>
          <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
            View transaction history and settlement details with this member
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Member Summary with Separate Debt Display */}
          <div className="flex flex-col items-center mb-6">
            <Avatar name={member.name} size="lg" />
            <h2 className="text-xl font-black mt-3 text-gray-900 tracking-tight">{member.name}</h2>
            
            {/* Separate Debt Display - NOT auto-balanced */}
            <div className="mt-3 space-y-2 text-center">
              {theyOweYou > 0 && (
                <div className="text-[#4a6850] font-black text-lg">
                  {member.name} owes you: Rs {theyOweYou.toLocaleString()}
                </div>
              )}
              {youOweThem > 0 && (
                <div className="text-red-600 font-black text-lg">
                  You owe {member.name}: Rs {youOweThem.toLocaleString()}
                </div>
              )}
              {theyOweYou === 0 && youOweThem === 0 && (
                <div className="text-[#4a6850] font-black">✅ All settled up!</div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          {member.paymentDetails && Object.keys(member.paymentDetails).length > 0 && (
            <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 border border-[#4a6850]/20 rounded-3xl p-5 mb-6 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
              <h3 className="font-black text-gray-900 mb-4 text-lg tracking-tight">Payment Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {member.paymentDetails.jazzCash && (
                  <div>
                    <p className="text-[#4a6850]/80 font-bold uppercase tracking-wide text-xs">JazzCash</p>
                    <p className="font-black text-gray-900 text-base">{member.paymentDetails.jazzCash}</p>
                  </div>
                )}
                {member.paymentDetails.easypaisa && (
                  <div>
                    <p className="text-[#4a6850]/80 font-bold uppercase tracking-wide text-xs">Easypaisa</p>
                    <p className="font-black text-gray-900 text-base">{member.paymentDetails.easypaisa}</p>
                  </div>
                )}
                {member.paymentDetails.bankName && (
                  <div>
                    <p className="text-[#4a6850]/80 font-bold uppercase tracking-wide text-xs">{member.paymentDetails.bankName}</p>
                    <p className="font-black text-gray-900 text-base">{member.paymentDetails.accountNumber}</p>
                  </div>
                )}
                {member.paymentDetails.raastId && (
                  <div>
                    <p className="text-[#4a6850]/80 font-bold uppercase tracking-wide text-xs">Raast ID</p>
                    <p className="font-black text-gray-900 text-base">{member.paymentDetails.raastId}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions - Both directions now available */}
          <div className="flex gap-3 mb-6">
            {/* Receive Payment Button */}
              {theyOweYou > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={onRecordPayment}
                      className="flex-1 h-14 bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white font-black rounded-3xl shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] hover:from-[#3d5643] hover:to-[#2f4336] transition-all"
                    >
                      <ArrowDownLeft className="w-5 h-5 mr-2" />
                      Received from {member.name}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800 max-w-xs">
                    <p>Record a payment you received from {member.name} to reduce their debt</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Pay to Member Button - NEW */}
              {youOweThem > 0 && onPayToMember && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={onPayToMember}
                      className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-3xl shadow-[0_8px_32px_rgba(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgba(59,130,246,0.4)] hover:from-blue-700 hover:to-indigo-700 transition-all"
                    >
                      <ArrowUpRight className="w-5 h-5 mr-2" />
                      Pay to {member.name}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800 max-w-xs">
                    <p>Pay the full amount (Rs {youOweThem.toLocaleString()}) you owe to {member.name}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* General Record Payment if no specific debts */}
              {theyOweYou === 0 && youOweThem === 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={onRecordPayment}
                      variant="outline"
                      className="flex-1 h-14 border-[#4a6850]/30 text-[#4a6850] hover:bg-[#4a6850]/10 font-black rounded-3xl shadow-lg hover:shadow-xl transition-all"
                    >
                      <HandCoins className="w-5 h-5 mr-2" />
                      Record Payment
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800">
                    <p>Record a payment between you and {member.name}</p>
                  </TooltipContent>
                </Tooltip>
            )}
          </div>

          {/* Balance History Ledger */}
          <div className="space-y-3">
            <h3 className="font-black text-gray-900 mb-4 text-lg tracking-tight">Balance Ledger with {member.name}</h3>
            
            {balanceHistory.length > 0 ? (
              balanceHistory.map(({ transaction, theyOweYouBefore, youOweThemBefore, theyOweYouAfter, youOweThemAfter }) => (
                <div
                  key={transaction.id}
                  className="rounded-3xl p-5 bg-white border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)] hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all"
                >
                  {/* Transaction Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-3xl flex items-center justify-center shrink-0 shadow-lg ${
                      transaction.direction === "received"
                        ? "bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white"
                        : "bg-gradient-to-br from-red-500 to-orange-500 text-white"
                    }`}>
                      {transaction.type === "payment" ? (
                        <HandCoins className={`w-6 h-6 font-bold`} />
                      ) : transaction.direction === "received" ? (
                        <ArrowDownLeft className="w-6 h-6 font-bold" />
                      ) : (
                        <ArrowUpRight className="w-6 h-6 font-bold" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-gray-900 text-lg tracking-tight">{transaction.title}</div>
                      <div className="flex items-center gap-2 text-sm text-[#4a6850]/80 mt-2 font-bold">
                        <Calendar className="w-4 h-4" />
                        <span>{transaction.date}</span>
                      </div>
                      {transaction.place && (
                        <div className="flex items-center gap-2 text-sm text-[#4a6850]/80 font-bold">
                          <MapPin className="w-4 h-4" />
                          <span>{transaction.place}</span>
                        </div>
                      )}
                      {transaction.method && (
                        <div className="flex items-center gap-2 text-sm text-[#4a6850]/80 font-bold">
                          {transaction.method === "cash" ? (
                            <Banknote className="w-4 h-4" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                          <span className="capitalize">{transaction.method}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className={`font-black text-xl tracking-tight ${
                      transaction.direction === "received" ? "text-[#4a6850]" : "text-red-600"
                    }`}>
                      {transaction.direction === "received" ? "+" : "-"}Rs {transaction.amount.toLocaleString()}
                    </div>
                  </div>

                  {/* Balance Change Ledger - Compact Mobile Layout */}
                  <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl p-3 mt-3 border border-[#4a6850]/10">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <p className="text-[#4a6850]/80 text-xs mb-1 font-black uppercase tracking-wide">Before</p>
                        <div className="space-y-0.5">
                          {theyOweYouBefore > 0 && (
                            <p className="font-black text-[#4a6850] text-xs">
                              They owe<br/>Rs {theyOweYouBefore.toLocaleString()}
                            </p>
                          )}
                          {youOweThemBefore > 0 && (
                            <p className="font-black text-red-600 text-xs">
                              You owe<br/>Rs {youOweThemBefore.toLocaleString()}
                            </p>
                          )}
                          {theyOweYouBefore === 0 && youOweThemBefore === 0 && (
                            <p className="font-black text-gray-500 text-xs">Settled</p>
                          )}
                        </div>
                      </div>
                      <div className="text-center flex flex-col items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-[#4a6850]/60 mb-1" />
                        <p className={`font-black text-sm ${transaction.balanceChange > 0 ? "text-[#4a6850]" : transaction.balanceChange < 0 ? "text-red-600" : "text-gray-500"}`}>
                          {transaction.balanceChange > 0 ? `+${transaction.balanceChange}` : 
                           transaction.balanceChange < 0 ? `${transaction.balanceChange}` : 
                           "0"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[#4a6850]/80 text-xs mb-1 font-black uppercase tracking-wide">After</p>
                        <div className="space-y-0.5">
                          {theyOweYouAfter > 0 && (
                            <p className="font-black text-[#4a6850] text-xs">
                              They owe<br/>Rs {theyOweYouAfter.toLocaleString()}
                            </p>
                          )}
                          {youOweThemAfter > 0 && (
                            <p className="font-black text-red-600 text-xs">
                              You owe<br/>Rs {youOweThemAfter.toLocaleString()}
                            </p>
                          )}
                          {theyOweYouAfter === 0 && youOweThemAfter === 0 && (
                            <p className="font-black text-gray-500 text-xs">Settled</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl border border-[#4a6850]/20 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
                <div className="text-6xl mb-4">🤝</div>
                <p className="text-[#4a6850]/80 font-bold text-lg">No transactions with {member.name} yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[#4a6850]/10 mt-auto bg-white flex-shrink-0">
          <Button 
            onClick={onClose} 
            variant="secondary" 
            className="w-full h-14 rounded-3xl font-black shadow-lg hover:shadow-xl transition-all"
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MemberDetailSheet;