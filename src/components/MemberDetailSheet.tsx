import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Avatar from "./Avatar";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Calendar, MapPin, CreditCard, Banknote } from "lucide-react";

interface Transaction {
  id: string;
  type: "expense" | "payment";
  title: string;
  amount: number;
  date: string;
  place?: string;
  method?: string;
  direction: "gave" | "received";
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
  onRecordPayment: () => void;
}

const MemberDetailSheet = ({ 
  open, 
  onClose, 
  member, 
  transactions,
  onRecordPayment 
}: MemberDetailSheetProps) => {
  if (!member) return null;

  const isPositive = member.balance >= 0;
  const balanceText = member.balance === 0
    ? "All settled up!"
    : isPositive
    ? `${member.name} owes you`
    : `You owe ${member.name}`;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-center">Transaction History</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Member Summary */}
          <div className="flex flex-col items-center mb-6">
            <Avatar name={member.name} size="lg" />
            <h2 className="text-xl font-bold mt-3">{member.name}</h2>
            <p className="text-muted-foreground text-sm">{balanceText}</p>
            {member.balance !== 0 && (
              <div className={`text-2xl font-bold mt-2 ${isPositive ? "text-positive" : "text-negative"}`}>
                Rs {Math.abs(member.balance)}
              </div>
            )}
          </div>

          {/* Payment Details */}
          {member.paymentDetails && Object.keys(member.paymentDetails).length > 0 && (
            <div className="bg-secondary rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-foreground mb-3">Payment Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {member.paymentDetails.jazzCash && (
                  <div>
                    <p className="text-muted-foreground">JazzCash</p>
                    <p className="font-medium">{member.paymentDetails.jazzCash}</p>
                  </div>
                )}
                {member.paymentDetails.easypaisa && (
                  <div>
                    <p className="text-muted-foreground">Easypaisa</p>
                    <p className="font-medium">{member.paymentDetails.easypaisa}</p>
                  </div>
                )}
                {member.paymentDetails.bankName && (
                  <div>
                    <p className="text-muted-foreground">{member.paymentDetails.bankName}</p>
                    <p className="font-medium">{member.paymentDetails.accountNumber}</p>
                  </div>
                )}
                {member.paymentDetails.raastId && (
                  <div>
                    <p className="text-muted-foreground">Raast ID</p>
                    <p className="font-medium">{member.paymentDetails.raastId}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-3 mb-6">
            <Button 
              onClick={onRecordPayment}
              className="flex-1 h-12"
              variant={isPositive ? "default" : "outline"}
            >
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              {isPositive ? "Received from them" : "Record Payment"}
            </Button>
            {!isPositive && member.balance !== 0 && (
              <Button 
                onClick={onRecordPayment}
                className="flex-1 h-12"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Pay {member.name}
              </Button>
            )}
          </div>

          {/* Transaction History */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground mb-3">History with {member.name}</h3>
            
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`rounded-xl p-4 ${
                    transaction.direction === "received"
                      ? "bg-positive/10 border border-positive/20"
                      : "bg-negative/10 border border-negative/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      transaction.direction === "received"
                        ? "bg-positive/20"
                        : "bg-negative/20"
                    }`}>
                      {transaction.type === "payment" ? (
                        <HandCoins className={`w-5 h-5 ${
                          transaction.direction === "received" ? "text-positive" : "text-negative"
                        }`} />
                      ) : transaction.direction === "received" ? (
                        <ArrowDownLeft className="w-5 h-5 text-positive" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-negative" />
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
                      {transaction.method && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                      transaction.direction === "received" ? "text-positive" : "text-negative"
                    }`}>
                      {transaction.direction === "received" ? "+" : "-"}Rs {transaction.amount}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🤝</div>
                <p className="text-muted-foreground">No transactions with {member.name} yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t mt-auto">
          <Button onClick={onClose} variant="secondary" className="w-full h-12">
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MemberDetailSheet;