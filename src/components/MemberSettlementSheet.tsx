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
    isTemporary?: boolean;
  };
  groupId: string;
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
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 z-[100]">
        <SheetHeader className="flex-shrink-0 mb-4 pt-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>

          <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">
            Settlement Details
          </SheetTitle>
          <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
            Manage payments with {member.name}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {/* Member Info Card */}
          <div className="flex items-center gap-3 bg-[#4a6850]/5 rounded-2xl p-3 border border-[#4a6850]/20">
            <Avatar name={member.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-gray-900 text-sm truncate">{member.name}</span>
                {member.isTemporary && (
                  <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">Temp</span>
                )}
              </div>
            </div>
          </div>

          {isSettled ? (
            // All Settled State - Compact
            <div className="text-center py-8 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl border border-[#4a6850]/20 shadow-md">
              <CheckCircle className="w-16 h-16 text-[#4a6850] mx-auto mb-4" />
              <h3 className="text-xl font-black text-[#4a6850] mb-2 tracking-tight">All Settled! 🎉</h3>
              <p className="text-[#4a6850]/80 font-bold text-sm">
                No pending payments with {member.name}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* What they owe you - Compact */}
              {hasReceivable && (
                <div className="bg-gradient-to-br from-[#4a6850]/10 to-[#3d5643]/10 border border-[#4a6850]/30 rounded-2xl p-4 shadow-md">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center shadow-md">
                      <ArrowDownLeft className="w-5 h-5 text-white font-bold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-[#4a6850] text-sm tracking-tight truncate">
                        {member.name} owes you
                      </h4>
                      <p className="text-xs text-[#4a6850]/80 font-bold truncate">
                        From expenses you paid
                      </p>
                    </div>
                  </div>

                  <div className="text-3xl font-black text-[#4a6850] mb-4 tracking-tight tabular-nums">
                    Rs {memberSettlement.toReceive.toLocaleString()}
                  </div>

                  {!showCustomReceive ? (
                    <div className="space-y-2">
                      <Button
                        onClick={() => handleMarkReceived()}
                        disabled={isProcessing || !hasReceivable}
                        className="w-full h-12 bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4336] text-white font-black rounded-2xl shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Mark Full Amount Received</span>
                      </Button>

                      <Button
                        onClick={() => setShowCustomReceive(true)}
                        disabled={isProcessing}
                        variant="outline"
                        className="w-full h-10 border-[#4a6850]/30 text-[#4a6850] hover:bg-[#4a6850]/10 font-black rounded-2xl shadow-sm hover:shadow-md transition-all text-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-2" />
                        Partial Payment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-black text-[#4a6850] mb-2 block uppercase tracking-wide">
                          Amount Received
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={customReceiveAmount}
                          onChange={(e) => setCustomReceiveAmount(e.target.value)}
                          className="border-[#4a6850]/30 focus:border-[#4a6850] h-10 rounded-xl font-bold text-base"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleCustomReceive}
                          disabled={isProcessing || !customReceiveAmount}
                          className="flex-1 h-10 bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4336] text-white font-black rounded-2xl shadow-md hover:shadow-lg transition-all text-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          Mark Received
                        </Button>

                        <Button
                          onClick={() => {
                            setShowCustomReceive(false);
                            setCustomReceiveAmount("");
                          }}
                          variant="outline"
                          className="flex-1 h-10 border-[#4a6850]/30 text-[#4a6850] hover:bg-[#4a6850]/10 font-black rounded-2xl shadow-sm hover:shadow-md transition-all text-sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-[#4a6850]/80 mt-2 text-center font-bold">
                    This will add money to your Available Budget
                  </p>
                </div>
              )}

              {/* What you owe them - Compact */}
              {hasPayable && (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-300 rounded-2xl p-4 shadow-md">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-md">
                      <ArrowUpRight className="w-5 h-5 text-white font-bold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-red-800 text-sm tracking-tight truncate">
                        You owe {member.name}
                      </h4>
                      <p className="text-xs text-red-600 font-bold truncate">
                        From expenses they paid
                      </p>
                    </div>
                  </div>

                  <div className="text-3xl font-black text-red-700 mb-4 tracking-tight tabular-nums">
                    Rs {memberSettlement.toPay.toLocaleString()}
                  </div>

                  {!showCustomPay ? (
                    <div className="space-y-2">
                      <Button
                        onClick={() => handleMarkPaid()}
                        disabled={isProcessing || !hasPayable}
                        className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black rounded-2xl shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-50"
                      >
                        <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Pay Full Amount</span>
                      </Button>

                      <Button
                        onClick={() => setShowCustomPay(true)}
                        disabled={isProcessing}
                        variant="outline"
                        className="w-full h-10 border-red-300 text-red-700 hover:bg-red-50 font-black rounded-2xl shadow-sm hover:shadow-md transition-all text-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-2" />
                        Partial Payment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-black text-red-800 mb-2 block uppercase tracking-wide">
                          Amount to Pay
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={customPayAmount}
                          onChange={(e) => setCustomPayAmount(e.target.value)}
                          className="border-red-300 focus:border-red-500 h-10 rounded-xl font-bold text-base"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleCustomPay}
                          disabled={isProcessing || !customPayAmount}
                          className="flex-1 h-10 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black rounded-2xl shadow-md hover:shadow-lg transition-all text-sm"
                        >
                          <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                          Mark Paid
                        </Button>

                        <Button
                          onClick={() => {
                            setShowCustomPay(false);
                            setCustomPayAmount("");
                          }}
                          variant="outline"
                          className="flex-1 h-10 border-red-300 text-red-700 hover:bg-red-50 font-black rounded-2xl shadow-sm hover:shadow-md transition-all text-sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-red-600 mt-2 text-center font-bold">
                    This will deduct money from your Available Budget
                  </p>
                </div>
              )}

              {/* Enterprise Note - Compact */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-300 rounded-2xl p-4 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white font-bold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-blue-900 mb-1.5 text-sm tracking-tight">Enterprise-Safe Tracking</h4>
                    <p className="text-xs text-blue-700 font-bold leading-relaxed">
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
            className="w-full h-12 rounded-2xl font-black shadow-md hover:shadow-lg transition-all"
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MemberSettlementSheet;