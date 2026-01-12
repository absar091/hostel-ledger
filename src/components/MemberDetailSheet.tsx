import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Avatar from "./Avatar";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Calendar, MapPin, CreditCard, Banknote, ArrowRight } from "lucide-react";

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

// Calculate running balances for ledger view - FIXED LOGIC
const calculateBalanceHistory = (transactions: Transaction[], currentBalance: number) => {
  const history: { transaction: Transaction; balanceBefore: number; balanceAfter: number }[] = [];
  
  let runningBalance = currentBalance;
  
  // Transactions are in reverse chronological order (newest first)
  // Work backwards to calculate the balance progression
  for (const transaction of transactions) {
    const balanceAfter = runningBalance;
    // The balance before = current balance - the change that transaction made
    const balanceBefore = runningBalance - transaction.balanceChange;
    
    history.push({
      transaction,
      balanceBefore,
      balanceAfter,
    });
    
    // Move to the previous balance for next iteration
    runningBalance = balanceBefore;
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
  const netBalance = theyOweYou - youOweThem; // Positive = they owe you net

  const balanceHistory = calculateBalanceHistory(transactions, netBalance);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white">
        <SheetHeader className="flex-shrink-0 mb-6">
          <SheetTitle className="text-center text-gray-900">Balance History</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Member Summary with Separate Debt Display */}
          <div className="flex flex-col items-center mb-6">
            <Avatar name={member.name} size="lg" />
            <h2 className="text-xl font-bold mt-3 text-gray-900">{member.name}</h2>
            
            {/* Separate Debt Display - NOT auto-balanced */}
            <div className="mt-3 space-y-2 text-center">
              {theyOweYou > 0 && (
                <div className="text-emerald-600 font-semibold">
                  {member.name} owes you: Rs {theyOweYou.toLocaleString()}
                </div>
              )}
              {youOweThem > 0 && (
                <div className="text-red-600 font-semibold">
                  You owe {member.name}: Rs {youOweThem.toLocaleString()}
                </div>
              )}
              {theyOweYou === 0 && youOweThem === 0 && (
                <div className="text-gray-500">✅ All settled up!</div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          {member.paymentDetails && Object.keys(member.paymentDetails).length > 0 && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {member.paymentDetails.jazzCash && (
                  <div>
                    <p className="text-gray-500">JazzCash</p>
                    <p className="font-medium text-gray-900">{member.paymentDetails.jazzCash}</p>
                  </div>
                )}
                {member.paymentDetails.easypaisa && (
                  <div>
                    <p className="text-gray-500">Easypaisa</p>
                    <p className="font-medium text-gray-900">{member.paymentDetails.easypaisa}</p>
                  </div>
                )}
                {member.paymentDetails.bankName && (
                  <div>
                    <p className="text-gray-500">{member.paymentDetails.bankName}</p>
                    <p className="font-medium text-gray-900">{member.paymentDetails.accountNumber}</p>
                  </div>
                )}
                {member.paymentDetails.raastId && (
                  <div>
                    <p className="text-gray-500">Raast ID</p>
                    <p className="font-medium text-gray-900">{member.paymentDetails.raastId}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions - Both directions now available */}
          <div className="flex gap-3 mb-6">
            {/* Receive Payment Button */}
            {theyOweYou > 0 && (
              <Button 
                onClick={onRecordPayment}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
              >
                <ArrowDownLeft className="w-4 h-4 mr-2" />
                Received from {member.name}
              </Button>
            )}
            
            {/* Pay to Member Button - NEW */}
            {youOweThem > 0 && onPayToMember && (
              <Button 
                onClick={onPayToMember}
                className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Pay to {member.name}
              </Button>
            )}
            
            {/* General Record Payment if no specific debts */}
            {theyOweYou === 0 && youOweThem === 0 && (
              <Button 
                onClick={onRecordPayment}
                variant="outline"
                className="flex-1 h-12"
              >
                <HandCoins className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            )}
          </div>

          {/* Balance History Ledger */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Balance Ledger with {member.name}</h3>
            
            {balanceHistory.length > 0 ? (
              balanceHistory.map(({ transaction, balanceBefore, balanceAfter }) => (
                <div
                  key={transaction.id}
                  className="rounded-xl p-4 bg-white border border-gray-100 shadow-sm"
                >
                  {/* Transaction Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      transaction.direction === "received"
                        ? "bg-emerald-100"
                        : "bg-red-100"
                    }`}>
                      {transaction.type === "payment" ? (
                        <HandCoins className={`w-5 h-5 ${
                          transaction.direction === "received" ? "text-emerald-600" : "text-red-600"
                        }`} />
                      ) : transaction.direction === "received" ? (
                        <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{transaction.title}</div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{transaction.date}</span>
                      </div>
                      {transaction.place && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <span>{transaction.place}</span>
                        </div>
                      )}
                      {transaction.method && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {transaction.method === "cash" ? (
                            <Banknote className="w-3 h-3" />
                          ) : (
                            <CreditCard className="w-3 h-3" />
                          )}
                          <span className="capitalize">{transaction.method}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className={`font-bold ${
                      transaction.direction === "received" ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {transaction.direction === "received" ? "+" : "-"}Rs {transaction.amount}
                    </div>
                  </div>

                  {/* Balance Change Ledger - Clearer format */}
                  <div className="bg-gray-50 rounded-lg p-3 mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-center flex-1">
                        <p className="text-gray-500 text-xs mb-1">Before</p>
                        <p className={`font-medium ${balanceBefore > 0 ? "text-emerald-600" : balanceBefore < 0 ? "text-red-600" : "text-gray-500"}`}>
                          {balanceBefore === 0 ? "Settled" : 
                           balanceBefore > 0 ? `They owe Rs ${balanceBefore}` : 
                           `You owe Rs ${Math.abs(balanceBefore)}`}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
                      <div className="text-center flex-1">
                        <p className="text-gray-500 text-xs mb-1">Change</p>
                        <p className={`font-medium ${transaction.balanceChange > 0 ? "text-emerald-600" : transaction.balanceChange < 0 ? "text-red-600" : "text-gray-500"}`}>
                          {transaction.balanceChange > 0 ? `+Rs ${transaction.balanceChange}` : 
                           transaction.balanceChange < 0 ? `-Rs ${Math.abs(transaction.balanceChange)}` : 
                           "Rs 0"}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
                      <div className="text-center flex-1">
                        <p className="text-gray-500 text-xs mb-1">After</p>
                        <p className={`font-medium ${balanceAfter > 0 ? "text-emerald-600" : balanceAfter < 0 ? "text-red-600" : "text-gray-500"}`}>
                          {balanceAfter === 0 ? "Settled" : 
                           balanceAfter > 0 ? `They owe Rs ${balanceAfter}` : 
                           `You owe Rs ${Math.abs(balanceAfter)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🤝</div>
                <p className="text-gray-500">No transactions with {member.name} yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 mt-auto bg-white">
          <Button onClick={onClose} variant="secondary" className="w-full h-12">
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MemberDetailSheet;