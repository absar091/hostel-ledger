import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Avatar from "@/components/Avatar";
import { ArrowDownLeft, ArrowUpRight, CheckCircle, DollarSign, Edit3 } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

interface MemberSettlementSheetProps {
  open: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    avatar?: string;
  };
  groupId: string; // ADDED: Group context for proper settlement tracking
}

const MemberSettlementSheet = ({ open, onClose, member, groupId }: MemberSettlementSheetProps) => {
  const { getSettlements, markPaymentReceived, markDebtPaid } = useFirebaseAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customReceiveAmount, setCustomReceiveAmount] = useState("");
  const [customPayAmount, setCustomPayAmount] = useState("");
  const [showCustomReceive, setShowCustomReceive] = useState(false);
  const [showCustomPay, setShowCustomPay] = useState(false);
  
  // FIXED: Get group-specific settlements instead of aggregated
  const settlements = getSettlements(groupId);
  const memberSettlement = settlements[member.id] || { toReceive: 0, toPay: 0 };
  
  const handleMarkReceived = async (amount?: number) => {
    const finalAmount = amount || memberSettlement.toReceive;
    if (finalAmount <= 0) return;
    
    setIsProcessing(true);
    try {
      // FIXED: Pass groupId as first parameter
      const result = await markPaymentReceived(groupId, member.id, finalAmount);
      if (result.success) {
        setCustomReceiveAmount("");
        setShowCustomReceive(false);
        onClose();
      } else {
        alert(result.error || "Failed to mark payment as received");
      }
    } catch (error) {
      console.error("Error marking payment received:", error);
      alert("Failed to mark payment as received");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPaid = async (amount?: number) => {
    const finalAmount = amount || memberSettlement.toPay;
    if (finalAmount <= 0) return;
    
    setIsProcessing(true);
    try {
      // FIXED: Pass groupId as first parameter
      const result = await markDebtPaid(groupId, member.id, finalAmount);
      if (result.success) {
        setCustomPayAmount("");
        setShowCustomPay(false);
        onClose();
      } else {
        alert(result.error || "Failed to mark debt as paid");
      }
    } catch (error) {
      console.error("Error marking debt paid:", error);
      alert("Failed to mark debt as paid");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomReceive = () => {
    const amount = parseFloat(customReceiveAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    handleMarkReceived(amount);
  };

  const handleCustomPay = () => {
    const amount = parseFloat(customPayAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    handleMarkPaid(amount);
  };

  const hasReceivable = memberSettlement.toReceive > 0;
  const hasPayable = memberSettlement.toPay > 0;
  const isSettled = !hasReceivable && !hasPayable;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="flex-shrink-0 mb-6">
          <SheetTitle className="text-center flex items-center justify-center gap-3">
            <Avatar name={member.name} size="sm" />
            {member.name} — Settlement Details
          </SheetTitle>
          <SheetDescription className="text-center text-sm text-gray-500">
            Manage payments and settlements with this group member
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
          {isSettled ? (
            // All Settled State
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-600 mb-2">All Settled! 🎉</h3>
              <p className="text-muted-foreground">
                No pending payments with {member.name}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* What they owe you */}
              {hasReceivable && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <ArrowDownLeft className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-800">
                        {member.name} owes you
                      </h4>
                      <p className="text-sm text-green-600">
                        From expenses you paid on their behalf
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-3xl font-bold text-green-700 mb-4">
                    Rs {memberSettlement.toReceive.toLocaleString()}
                  </div>
                  
                  {!showCustomReceive ? (
                    <div className="space-y-2">
                      <Button 
                        onClick={() => handleMarkReceived()}
                        disabled={isProcessing}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Full Amount Received Rs {memberSettlement.toReceive.toLocaleString()}
                      </Button>
                      
                      <Button 
                        onClick={() => setShowCustomReceive(true)}
                        disabled={isProcessing}
                        variant="outline"
                        className="w-full border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Partial Payment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-green-800 mb-2 block">
                          Amount Received
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={customReceiveAmount}
                          onChange={(e) => setCustomReceiveAmount(e.target.value)}
                          className="border-green-300 focus:border-green-500"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleCustomReceive}
                          disabled={isProcessing || !customReceiveAmount}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Received
                        </Button>
                        
                        <Button 
                          onClick={() => {
                            setShowCustomReceive(false);
                            setCustomReceiveAmount("");
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-green-600 mt-2 text-center">
                    This will add money to your Available Budget
                  </p>
                </div>
              )}

              {/* What you owe them */}
              {hasPayable && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-800">
                        You owe {member.name}
                      </h4>
                      <p className="text-sm text-red-600">
                        From expenses they paid on your behalf
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-3xl font-bold text-red-700 mb-4">
                    Rs {memberSettlement.toPay.toLocaleString()}
                  </div>
                  
                  {!showCustomPay ? (
                    <div className="space-y-2">
                      <Button 
                        onClick={() => handleMarkPaid()}
                        disabled={isProcessing}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Pay Full Amount Rs {memberSettlement.toPay.toLocaleString()}
                      </Button>
                      
                      <Button 
                        onClick={() => setShowCustomPay(true)}
                        disabled={isProcessing}
                        variant="outline"
                        className="w-full border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Partial Payment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-red-800 mb-2 block">
                          Amount to Pay
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={customPayAmount}
                          onChange={(e) => setCustomPayAmount(e.target.value)}
                          className="border-red-300 focus:border-red-500"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleCustomPay}
                          disabled={isProcessing || !customPayAmount}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Mark Paid
                        </Button>
                        
                        <Button 
                          onClick={() => {
                            setShowCustomPay(false);
                            setCustomPayAmount("");
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-red-600 mt-2 text-center">
                    This will deduct money from your Available Budget
                  </p>
                </div>
              )}

              {/* Enterprise Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Enterprise-Safe Tracking</h4>
                    <p className="text-sm text-blue-700">
                      These amounts are tracked separately and never auto-merged. 
                      Each settlement requires your explicit confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-4 border-t bg-background">
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full h-12"
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MemberSettlementSheet;