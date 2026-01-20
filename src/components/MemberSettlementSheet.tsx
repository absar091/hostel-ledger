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
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white shadow-[0_25px_70px_rgba(74,104,80,0.3)] border-t-2 border-[#4a6850]/20 z-[100]">
        <SheetHeader className="flex-shrink-0 mb-6 bg-gradient-to-r from-[#4a6850]/5 to-[#3d5643]/5 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-3xl border-b border-[#4a6850]/10">
          <SheetTitle className="text-center flex items-center justify-center gap-3 font-black text-xl tracking-tight text-gray-900">
            <Avatar name={member.name} size="sm" />
            {member.name} — Settlement Details
          </SheetTitle>
          <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
            Manage payments and settlements with this group member
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
          {isSettled ? (
            // All Settled State
            <div className="text-center py-12 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl border border-[#4a6850]/20 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
              <CheckCircle className="w-20 h-20 text-[#4a6850] mx-auto mb-6" />
              <h3 className="text-2xl font-black text-[#4a6850] mb-3 tracking-tight">All Settled! 🎉</h3>
              <p className="text-[#4a6850]/80 font-bold text-lg">
                No pending payments with {member.name}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* What they owe you */}
              {hasReceivable && (
                <div className="bg-gradient-to-br from-[#4a6850]/10 to-[#3d5643]/10 border border-[#4a6850]/30 rounded-3xl p-6 shadow-[0_20px_60px_rgba(74,104,80,0.15)]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center shadow-lg">
                      <ArrowDownLeft className="w-7 h-7 text-white font-bold" />
                    </div>
                    <div>
                      <h4 className="font-black text-[#4a6850] text-lg tracking-tight">
                        {member.name} owes you
                      </h4>
                      <p className="text-sm text-[#4a6850]/80 font-bold">
                        From expenses you paid on their behalf
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-4xl font-black text-[#4a6850] mb-6 tracking-tight tabular-nums">
                    Rs {memberSettlement.toReceive.toLocaleString()}
                  </div>
                  
                  {!showCustomReceive ? (
                    <div className="space-y-3">
                      <Button 
                        onClick={() => handleMarkReceived()}
                        disabled={isProcessing}
                        className="w-full h-14 bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4336] text-white font-black rounded-3xl shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all text-base"
                      >
                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span className="truncate">Mark Full Amount Received Rs {memberSettlement.toReceive.toLocaleString()}</span>
                      </Button>
                      
                      <Button 
                        onClick={() => setShowCustomReceive(true)}
                        disabled={isProcessing}
                        variant="outline"
                        className="w-full h-12 border-[#4a6850]/30 text-[#4a6850] hover:bg-[#4a6850]/10 font-black rounded-3xl shadow-lg hover:shadow-xl transition-all"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Partial Payment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-black text-[#4a6850] mb-3 block uppercase tracking-wide">
                          Amount Received
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={customReceiveAmount}
                          onChange={(e) => setCustomReceiveAmount(e.target.value)}
                          className="border-[#4a6850]/30 focus:border-[#4a6850] h-12 rounded-2xl font-bold text-lg"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleCustomReceive}
                          disabled={isProcessing || !customReceiveAmount}
                          className="flex-1 h-12 bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4336] text-white font-black rounded-3xl shadow-lg hover:shadow-xl transition-all"
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
                          className="flex-1 h-12 border-[#4a6850]/30 text-[#4a6850] hover:bg-[#4a6850]/10 font-black rounded-3xl shadow-lg hover:shadow-xl transition-all"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-[#4a6850]/80 mt-3 text-center font-bold">
                    This will add money to your Available Budget
                  </p>
                </div>
              )}

              {/* What you owe them */}
              {hasPayable && (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-300 rounded-3xl p-6 shadow-[0_20px_60px_rgba(239,68,68,0.15)]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-lg">
                      <ArrowUpRight className="w-7 h-7 text-white font-bold" />
                    </div>
                    <div>
                      <h4 className="font-black text-red-800 text-lg tracking-tight">
                        You owe {member.name}
                      </h4>
                      <p className="text-sm text-red-600 font-bold">
                        From expenses they paid on your behalf
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-4xl font-black text-red-700 mb-6 tracking-tight tabular-nums">
                    Rs {memberSettlement.toPay.toLocaleString()}
                  </div>
                  
                  {!showCustomPay ? (
                    <div className="space-y-3">
                      <Button 
                        onClick={() => handleMarkPaid()}
                        disabled={isProcessing}
                        className="w-full h-14 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black rounded-3xl shadow-[0_8px_32px_rgba(239,68,68,0.3)] hover:shadow-[0_12px_40px_rgba(239,68,68,0.4)] transition-all text-base"
                      >
                        <DollarSign className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span className="truncate">Pay Full Amount Rs {memberSettlement.toPay.toLocaleString()}</span>
                      </Button>
                      
                      <Button 
                        onClick={() => setShowCustomPay(true)}
                        disabled={isProcessing}
                        variant="outline"
                        className="w-full h-12 border-red-300 text-red-700 hover:bg-red-50 font-black rounded-3xl shadow-lg hover:shadow-xl transition-all"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Partial Payment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-black text-red-800 mb-3 block uppercase tracking-wide">
                          Amount to Pay
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={customPayAmount}
                          onChange={(e) => setCustomPayAmount(e.target.value)}
                          className="border-red-300 focus:border-red-500 h-12 rounded-2xl font-bold text-lg"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleCustomPay}
                          disabled={isProcessing || !customPayAmount}
                          className="flex-1 h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black rounded-3xl shadow-lg hover:shadow-xl transition-all"
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
                          className="flex-1 h-12 border-red-300 text-red-700 hover:bg-red-50 font-black rounded-3xl shadow-lg hover:shadow-xl transition-all"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-red-600 mt-3 text-center font-bold">
                    This will deduct money from your Available Budget
                  </p>
                </div>
              )}

              {/* Enterprise Note */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-300 rounded-3xl p-6 shadow-[0_20px_60px_rgba(59,130,246,0.15)]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mt-1 shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white font-bold" />
                  </div>
                  <div>
                    <h4 className="font-black text-blue-900 mb-2 text-lg tracking-tight">Enterprise-Safe Tracking</h4>
                    <p className="text-sm text-blue-700 font-bold leading-relaxed">
                      These amounts are tracked separately and never auto-merged. 
                      Each settlement requires your explicit confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-4 border-t border-[#4a6850]/10 bg-white">
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full h-14 rounded-3xl font-black shadow-lg hover:shadow-xl transition-all"
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MemberSettlementSheet;