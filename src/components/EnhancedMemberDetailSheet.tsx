import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Avatar from "./Avatar";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Calendar, MapPin, CreditCard, Banknote, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { calculateDebtSummary, generateSettlementOptions, SettlementOption } from "@/lib/debtTracking";

interface Transaction {
  id: string;
  type: "expense" | "payment";
  title: string;
  amount: number;
  date: string;
  place?: string;
  method?: string;
  direction: "gave" | "received";
  balanceChange: number;
}

interface EnhancedMemberDetailSheetProps {
  open: boolean;
  onClose: () => void;
  member: {
    id: string;
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
  groupId: string;
  transactions: Transaction[];
  onRecordPayment: () => void;
  onSettleDebt: (option: SettlementOption) => void;
}

const EnhancedMemberDetailSheet = ({ 
  open, 
  onClose, 
  member,
  groupId,
  transactions,
  onRecordPayment,
  onSettleDebt
}: EnhancedMemberDetailSheetProps) => {
  const { getIndividualDebts } = useFirebaseAuth();
  const [activeTab, setActiveTab] = useState<"debts" | "history">("debts");
  const [showSettlementOptions, setShowSettlementOptions] = useState(false);

  // Get individual debt summary
  const debtSummary = member ? getIndividualDebts(groupId, member.id) : null;
  const settlementOptions = debtSummary ? generateSettlementOptions(debtSummary) : [];

  if (!member || !debtSummary) return null;

  const formatBalance = (amount: number, memberName: string) => {
    if (amount === 0) return "All settled up!";
    if (amount > 0) return `${memberName} owes you`;
    return `You owe ${memberName}`;
  };

  const handleSettlement = (option: SettlementOption) => {
    onSettleDebt(option);
    setShowSettlementOptions(false);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="flex-shrink-0 mb-6">
          <SheetTitle className="text-center">Financial Details</SheetTitle>
          <SheetDescription className="text-center text-sm text-gray-500">
            Detailed financial overview and settlement options for this member
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Member Summary */}
          <div className="flex flex-col items-center mb-6">
            <Avatar name={member.name} size="lg" />
            <h2 className="text-xl font-bold mt-3">{member.name}</h2>
            <p className="text-muted-foreground text-sm">
              {formatBalance(debtSummary.netAmount, member.name)}
            </p>
            {debtSummary.netAmount !== 0 && (
              <div className={`text-2xl font-bold mt-2 ${
                debtSummary.netAmount > 0 ? "text-green-400" : "text-red-400"
              }`}>
                Rs {Math.abs(debtSummary.netAmount).toLocaleString()}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6">
            <button
              onClick={() => setActiveTab("debts")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "debts"
                  ? "bg-primary text-primary-foreground"
                  : "glass-card text-muted-foreground hover:bg-cyan-500/10"
              }`}
            >
              Individual Debts
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "bg-primary text-primary-foreground"
                  : "glass-card text-muted-foreground hover:bg-cyan-500/10"
              }`}
            >
              Transaction History
            </button>
          </div>

          {/* Individual Debts Tab */}
          {activeTab === "debts" && (
            <div className="space-y-6">
              {/* Debts You Owe */}
              {debtSummary.youOwe.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4" />
                    You owe {member.name} (Rs {debtSummary.totalYouOwe.toLocaleString()})
                  </h3>
                  <div className="space-y-2">
                    {debtSummary.youOwe.map((debt) => (
                      <div key={debt.id} className="glass-card p-4 bg-red-500/5 border-red-400/20">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{debt.expenseTitle}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3" />
                              {debt.date}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-400">Rs {debt.amount.toLocaleString()}</div>
                            {debt.settled && (
                              <div className="text-xs text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Settled
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Debts They Owe */}
              {debtSummary.theyOwe.length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4" />
                    {member.name} owes you (Rs {debtSummary.totalTheyOwe.toLocaleString()})
                  </h3>
                  <div className="space-y-2">
                    {debtSummary.theyOwe.map((debt) => (
                      <div key={debt.id} className="glass-card p-4 bg-green-500/5 border-green-400/20">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{debt.expenseTitle}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3" />
                              {debt.date}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-400">Rs {debt.amount.toLocaleString()}</div>
                            {debt.settled && (
                              <div className="text-xs text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Settled
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Debts */}
              {debtSummary.youOwe.length === 0 && debtSummary.theyOwe.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-400/40">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">All Settled Up!</h3>
                  <p className="text-muted-foreground text-sm">
                    No pending debts with {member.name}
                  </p>
                </div>
              )}

              {/* Payment Details */}
              {member.paymentDetails && Object.keys(member.paymentDetails).length > 0 && (
                <div className="glass-card p-4 bg-cyan-500/10 border-cyan-400/20">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                    Payment Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {member.paymentDetails.jazzCash && (
                      <div>
                        <p className="text-muted-foreground">JazzCash</p>
                        <p className="font-mono text-foreground">{member.paymentDetails.jazzCash}</p>
                      </div>
                    )}
                    {member.paymentDetails.easypaisa && (
                      <div>
                        <p className="text-muted-foreground">Easypaisa</p>
                        <p className="font-mono text-foreground">{member.paymentDetails.easypaisa}</p>
                      </div>
                    )}
                    {member.paymentDetails.bankName && (
                      <div>
                        <p className="text-muted-foreground">Bank</p>
                        <p className="font-mono text-foreground">{member.paymentDetails.bankName}</p>
                      </div>
                    )}
                    {member.paymentDetails.accountNumber && (
                      <div>
                        <p className="text-muted-foreground">Account</p>
                        <p className="font-mono text-foreground">{member.paymentDetails.accountNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transaction History Tab */}
          {activeTab === "history" && (
            <div className="space-y-3">
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="glass-card p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        transaction.direction === "received"
                          ? "bg-green-500/20"
                          : "bg-red-500/20"
                      }`}>
                        {transaction.type === "payment" ? (
                          <HandCoins className={`w-5 h-5 ${
                            transaction.direction === "received" ? "text-green-400" : "text-red-400"
                          }`} />
                        ) : transaction.direction === "received" ? (
                          <ArrowDownLeft className="w-5 h-5 text-green-400" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground">{transaction.title}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{transaction.date}</span>
                        </div>
                        {transaction.place && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{transaction.place}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-bold ${
                          transaction.direction === "received" ? "text-green-400" : "text-red-400"
                        }`}>
                          {transaction.direction === "received" ? "+" : "-"}Rs {transaction.amount.toLocaleString()}
                        </div>
                        {transaction.method && (
                          <div className="text-xs text-muted-foreground capitalize">
                            {transaction.method}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No transaction history with {member.name}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 pt-4 border-t bg-background">
          <div className="flex gap-3 mb-3">
            <Button
              onClick={onRecordPayment}
              variant="outline"
              className="flex-1 h-12"
            >
              <HandCoins className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
            
            {(debtSummary.youOwe.length > 0 || debtSummary.theyOwe.length > 0) && (
              <Button
                onClick={() => setShowSettlementOptions(true)}
                className="flex-1 h-12"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Settle Debts
              </Button>
            )}
          </div>
        </div>

        {/* Settlement Options Modal */}
        {showSettlementOptions && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center">
            <div className="mobile-card w-full sm:max-w-md sm:mx-4 max-h-[85vh] overflow-y-auto sm:rounded-3xl rounded-t-3xl">
              <div className="p-6">
                <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6 sm:hidden"></div>
                
                <h3 className="text-xl font-bold text-foreground mb-6 text-center">
                  Settlement Options
                </h3>
                
                <div className="space-y-3 mb-6">
                  {settlementOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleSettlement(option)}
                      className="w-full p-4 glass-card hover:bg-cyan-500/10 transition-colors text-left"
                    >
                      <div className="font-medium text-foreground">{option.description}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Amount: Rs {option.amount.toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
                
                <Button
                  onClick={() => setShowSettlementOptions(false)}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default EnhancedMemberDetailSheet;