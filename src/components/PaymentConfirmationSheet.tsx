import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Avatar from "./Avatar";
import { Wallet, AlertCircle, CheckCircle } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

interface PaymentConfirmationSheetProps {
  open: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    amount?: number; // New settlement system amount
    balance?: number; // Old balance system (for backward compatibility)
    groupId?: string;
  } | null;
  onConfirmPayment: (memberId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
}

const PaymentConfirmationSheet = ({ 
  open, 
  onClose, 
  member, 
  onConfirmPayment 
}: PaymentConfirmationSheetProps) => {
  const { getWalletBalance } = useFirebaseAuth();
  const walletBalance = getWalletBalance();

  if (!member) return null;

  // Handle both new settlement system (amount) and old balance system (balance)
  const amountToPay = member.amount || Math.abs(member.balance || 0);
  
  // Validate amount to prevent NaN
  if (isNaN(amountToPay) || amountToPay <= 0) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[40vh] rounded-t-3xl flex flex-col">
          <SheetHeader className="flex-shrink-0 mb-6">
            <SheetTitle className="text-center">Payment Error</SheetTitle>
            <SheetDescription className="text-center text-sm text-gray-500">
              Unable to process payment due to invalid amount
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Invalid Payment Amount</h3>
              <p className="text-muted-foreground mb-4">
                Unable to determine the payment amount for {member.name}
              </p>
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  
  const hasEnoughBalance = walletBalance >= amountToPay;

  const handlePayNow = async () => {
    if (!hasEnoughBalance) return;

    const result = await onConfirmPayment(member.id, amountToPay);
    if (result.success) {
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="flex-shrink-0 mb-6">
          <SheetTitle className="text-center">Pay from Wallet</SheetTitle>
          <SheetDescription className="text-center text-sm text-gray-500">
            Confirm payment to a group member from your wallet balance
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
          {/* Member Info */}
          <div className="text-center">
            <Avatar name={member.name} size="lg" />
            <h3 className="text-xl font-bold mt-3">{member.name}</h3>
            <p className="text-muted-foreground">You owe them</p>
            <div className="text-3xl font-bold text-negative mt-2">
              Rs {amountToPay.toLocaleString()}
            </div>
          </div>

          {/* Wallet Balance Check */}
          <div className={`rounded-xl p-4 border-2 ${
            hasEnoughBalance 
              ? "bg-positive/5 border-positive/20" 
              : "bg-negative/5 border-negative/20"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                hasEnoughBalance ? "bg-positive/20" : "bg-negative/20"
              }`}>
                {hasEnoughBalance ? (
                  <CheckCircle className="w-5 h-5 text-positive" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-negative" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold">
                  {hasEnoughBalance ? "Sufficient Balance" : "Insufficient Balance"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Wallet Balance: Rs {walletBalance.toLocaleString()}
                </div>
              </div>
              <Wallet className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-secondary rounded-xl p-4">
            <h4 className="font-semibold mb-3">Payment Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount to pay</span>
                <span className="font-medium">Rs {amountToPay.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment method</span>
                <span className="font-medium">Wallet</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Balance after payment</span>
                <span className={`font-medium ${
                  hasEnoughBalance ? "text-foreground" : "text-negative"
                }`}>
                  Rs {hasEnoughBalance ? (walletBalance - amountToPay).toLocaleString() : "Insufficient"}
                </span>
              </div>
            </div>
          </div>

          {!hasEnoughBalance && (
            <div className="bg-negative/5 border border-negative/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-negative mt-0.5" />
                <div>
                  <div className="font-semibold text-negative">Insufficient Wallet Balance</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    You need Rs {(amountToPay - walletBalance).toLocaleString()} more in your wallet to make this payment.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-4 border-t bg-background">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayNow}
              disabled={!hasEnoughBalance}
              className="flex-1 h-12"
            >
              {hasEnoughBalance ? "Pay Now" : "Insufficient Balance"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PaymentConfirmationSheet;