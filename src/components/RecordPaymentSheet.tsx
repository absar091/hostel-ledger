import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Banknote, Smartphone, ChevronRight, Info, CreditCard } from "lucide-react";
import Avatar from "./Avatar";
import Tooltip from "./Tooltip";
import { cn } from "@/lib/utils";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

interface Member {
  id: string;
  name: string;
  paymentDetails?: {
    jazzCash?: string;
    easypaisa?: string;
    bankName?: string;
    accountNumber?: string;
    raastId?: string;
  };
  phone?: string;
}

interface Group {
  id: string;
  name: string;
  emoji: string;
  members: Member[];
}

interface RecordPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  onSubmit: (data: {
    groupId: string;
    fromMember: string;
    amount: number;
    method: "cash" | "online";
    note: string;
  }) => void;
}

const RecordPaymentSheet = ({ open, onClose, groups, onSubmit }: RecordPaymentSheetProps) => {
  const { getSettlements } = useFirebaseAuth();
  const [step, setStep] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [fromMember, setFromMember] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "online">("cash");
  const [note, setNote] = useState("");

  // Get members from selected group (exclude "You")
  const otherMembers = useMemo(() => {
    const group = groups.find((g) => g.id === selectedGroup);
    return group?.members.filter((m) => m.name !== "You") || [];
  }, [groups, selectedGroup]);

  // Get settlement data for selected group
  const settlements = selectedGroup ? getSettlements(selectedGroup) : {};
  
  // Get selected member's details including settlement info
  const selectedMemberData = useMemo(() => {
    if (!fromMember || !selectedGroup) return null;
    
    const member = otherMembers.find(m => m.id === fromMember);
    if (!member) return null;
    
    const settlement = settlements[fromMember] || { toReceive: 0, toPay: 0 };
    const group = groups.find(g => g.id === selectedGroup);
    const fullMember = group?.members.find(m => m.id === fromMember);
    
    return {
      ...member,
      settlement,
      paymentDetails: fullMember?.paymentDetails,
      phone: fullMember?.phone
    };
  }, [fromMember, selectedGroup, otherMembers, settlements, groups]);

  // Auto-select group if only one exists
  useEffect(() => {
    if (open && groups.length === 1) {
      setSelectedGroup(groups[0].id);
      setStep(2);
    }
  }, [open, groups]);

  const handleClose = () => {
    setStep(groups.length === 1 ? 2 : 1);
    setSelectedGroup(groups.length === 1 ? groups[0]?.id || "" : "");
    setFromMember("");
    setAmount("");
    setMethod("cash");
    setNote("");
    onClose();
  };

  const handleSubmit = () => {
    // Final validation before submission
    const amountValue = parseFloat(amount);
    
    if (!selectedGroup) {
      console.error("No group selected");
      return;
    }
    
    if (!fromMember) {
      console.error("No payer selected");
      return;
    }
    
    if (isNaN(amountValue) || amountValue <= 0) {
      console.error("Invalid amount");
      return;
    }

    // Check if fromMember exists in otherMembers
    const memberExists = otherMembers.some(m => m.id === fromMember);
    if (!memberExists) {
      console.error("Invalid member ID");
      return;
    }

    onSubmit({
      groupId: selectedGroup,
      fromMember,
      amount: amountValue,
      method,
      note: note.trim(),
    });
    handleClose();
  };

  const canProceed = () => {
    if (step === 1) return selectedGroup !== "";
    if (step === 2) return fromMember !== "";
    if (step === 3) {
      const amountValue = parseFloat(amount);
      return amountValue > 0 && !isNaN(amountValue);
    }
    return true;
  };

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);
  const selectedMemberName = otherMembers.find((m) => m.id === fromMember)?.name;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 shadow-[0_-20px_60px_rgba(74,104,80,0.1)] z-[100]">
        <SheetHeader className="flex-shrink-0 mb-6 pt-2">
          {/* Handle Bar */}
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
          
          <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">
            {step === 1 && "Select Group"}
            {step === 2 && "Who Paid You?"}
            {step === 3 && "Payment Details"}
          </SheetTitle>
          <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
            Record a payment received from a group member
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Step 1: Select Group - Compact Mobile Style */}
          {step === 1 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-[#4a6850]/80 mb-4 text-center font-bold">
                Which group is this payment from?
              </p>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                    selectedGroup === group.id
                      ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                      : "bg-white border border-[#4a6850]/10 hover:bg-[#4a6850]/5"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 flex items-center justify-center text-xl shadow-sm flex-shrink-0">
                    {group.emoji}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <span className="font-black text-gray-900 tracking-tight block truncate">{group.name}</span>
                    <p className="text-xs text-[#4a6850]/80 font-bold">
                      {group.members.length} members
                    </p>
                  </div>
                  {selectedGroup === group.id && (
                    <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center shadow-md flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-white font-bold" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Who paid you - Compact Mobile Style */}
          {step === 2 && (
            <div className="animate-fade-in">
              {selectedGroupData && (
                <div className="flex items-center justify-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-[#4a6850]/10 rounded-2xl px-4 py-2 border border-[#4a6850]/20">
                    <span className="text-xl">{selectedGroupData.emoji}</span>
                    <span className="text-sm font-black text-[#4a6850]">{selectedGroupData.name}</span>
                  </div>
                </div>
              )}
              <p className="text-sm text-[#4a6850]/80 mb-4 text-center font-bold">
                Who sent you money?
              </p>
              <div className="space-y-3">
                {otherMembers.map((member) => {
                  const settlement = settlements[member.id] || { toReceive: 0, toPay: 0 };
                  const owesYou = settlement.toReceive > 0;
                  const youOwe = settlement.toPay > 0;
                  const isSettled = settlement.toReceive === 0 && settlement.toPay === 0;
                  
                  return (
                    <button
                      key={member.id}
                      onClick={() => setFromMember(member.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                        fromMember === member.id
                          ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                          : "bg-white border border-[#4a6850]/10 hover:bg-[#4a6850]/5"
                      )}
                    >
                      <Avatar name={member.name} size="sm" />
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-black text-gray-900 tracking-tight truncate">{member.name}</div>
                        <div className="text-xs font-bold truncate">
                          {isSettled ? (
                            <span className="text-[#4a6850]">✅ All settled</span>
                          ) : owesYou ? (
                            <span className="text-[#4a6850]">Owes Rs {settlement.toReceive.toLocaleString()}</span>
                          ) : youOwe ? (
                            <span className="text-red-500">You owe Rs {settlement.toPay.toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-500">No pending</span>
                          )}
                        </div>
                      </div>
                      {fromMember === member.id && (
                        <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center shadow-md flex-shrink-0">
                          <Check className="w-3.5 h-3.5 text-white font-bold" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Amount and details - Compact Mobile Style */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              {/* Member Details Card - Compact */}
              {selectedMemberData && (
                <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl p-4 border border-[#4a6850]/20 shadow-md">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={selectedMemberData.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 text-base tracking-tight truncate">{selectedMemberData.name}</h3>
                      <div className="text-xs font-bold truncate">
                        {selectedMemberData.settlement.toReceive > 0 ? (
                          <span className="text-[#4a6850]">
                            💰 Owes Rs {selectedMemberData.settlement.toReceive.toLocaleString()}
                          </span>
                        ) : selectedMemberData.settlement.toPay > 0 ? (
                          <span className="text-red-500">
                            💸 You owe Rs {selectedMemberData.settlement.toPay.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[#4a6850]">✅ All settled</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Details - Compact */}
                  {selectedMemberData.paymentDetails && Object.keys(selectedMemberData.paymentDetails).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#4a6850]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-[#4a6850]" />
                        <span className="text-xs font-black text-[#4a6850] uppercase tracking-wide">Payment Info</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {selectedMemberData.paymentDetails.jazzCash && (
                          <div className="bg-white rounded-xl p-2 border border-[#4a6850]/10">
                            <span className="text-[#4a6850]/70 font-bold block">JazzCash</span>
                            <div className="font-black text-gray-900 font-mono text-xs truncate">{selectedMemberData.paymentDetails.jazzCash}</div>
                          </div>
                        )}
                        {selectedMemberData.paymentDetails.easypaisa && (
                          <div className="bg-white rounded-xl p-2 border border-[#4a6850]/10">
                            <span className="text-[#4a6850]/70 font-bold block">Easypaisa</span>
                            <div className="font-black text-gray-900 font-mono text-xs truncate">{selectedMemberData.paymentDetails.easypaisa}</div>
                          </div>
                        )}
                        {selectedMemberData.paymentDetails.bankName && (
                          <div className="bg-white rounded-xl p-2 border border-[#4a6850]/10">
                            <span className="text-[#4a6850]/70 font-bold block">Bank</span>
                            <div className="font-black text-gray-900 font-mono text-xs truncate">{selectedMemberData.paymentDetails.bankName}</div>
                          </div>
                        )}
                        {selectedMemberData.paymentDetails.accountNumber && (
                          <div className="bg-white rounded-xl p-2 border border-[#4a6850]/10">
                            <span className="text-[#4a6850]/70 font-bold block">Account</span>
                            <div className="font-black text-gray-900 font-mono text-xs truncate">{selectedMemberData.paymentDetails.accountNumber}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Amount Suggestion - Compact */}
                  {selectedMemberData.settlement.toReceive > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#4a6850]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-[#4a6850]" />
                        <span className="text-xs font-black text-[#4a6850] uppercase tracking-wide">Quick Fill</span>
                      </div>
                      <button
                        onClick={() => setAmount(selectedMemberData.settlement.toReceive.toString())}
                        className="w-full bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white px-4 py-2 rounded-xl transition-all font-black shadow-md hover:shadow-lg text-sm"
                      >
                        Full Amount: Rs {selectedMemberData.settlement.toReceive.toLocaleString()}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Amount - Compact */}
              <div>
                <label className="text-xs font-black text-[#4a6850]/80 mb-2 block uppercase tracking-wide">
                  Amount from {selectedMemberName}
                </label>
                <div className="text-center mb-4">
                  <div className="text-3xl font-black text-gray-900 mb-3 tracking-tighter tabular-nums">
                    Rs {amount || "0"}
                  </div>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-center text-lg h-12 max-w-sm mx-auto rounded-2xl border-[#4a6850]/20 shadow-md font-black text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-lg"
                    autoFocus
                  />
                </div>
              </div>

              {/* Payment Method - Compact */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs font-black text-[#4a6850]/80 uppercase tracking-wide">
                    Payment method
                  </label>
                  <Tooltip 
                    content="Select how you received the payment"
                    position="top"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMethod("cash")}
                    className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                      method === "cash"
                        ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                        : "bg-white border border-[#4a6850]/10 hover:bg-[#4a6850]/5"
                    )}
                  >
                    <Banknote className={cn(
                      "w-5 h-5 font-bold",
                      method === "cash" ? "text-[#4a6850]" : "text-gray-500"
                    )} />
                    <span className={cn(
                      "font-black tracking-tight text-sm",
                      method === "cash" ? "text-[#4a6850]" : "text-gray-900"
                    )}>Cash</span>
                  </button>
                  
                  <button
                    onClick={() => setMethod("online")}
                    className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                      method === "online"
                        ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                        : "bg-white border border-[#4a6850]/10 hover:bg-[#4a6850]/5"
                    )}
                  >
                    <Smartphone className={cn(
                      "w-5 h-5 font-bold",
                      method === "online" ? "text-[#4a6850]" : "text-gray-500"
                    )} />
                    <span className={cn(
                      "font-black tracking-tight text-sm",
                      method === "online" ? "text-[#4a6850]" : "text-gray-900"
                    )}>Online</span>
                  </button>
                </div>
              </div>

              {/* Note - Compact */}
              <div>
                <label className="text-xs font-black text-[#4a6850]/80 mb-2 block uppercase tracking-wide">
                  Note (optional)
                </label>
                <Input
                  placeholder="e.g., Mess payment"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-12 rounded-2xl border-[#4a6850]/20 shadow-md font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-lg"
                />
              </div>

              {/* Summary - Compact */}
              {parseFloat(amount) > 0 && (
                <div className="bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-2xl p-4 shadow-lg text-white animate-fade-in">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedMemberName || ""} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-lg tracking-tight text-white truncate">
                        +Rs {amount}
                      </div>
                      <div className="text-xs text-white/90 font-bold truncate">
                        from {selectedMemberName} • {method}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-6 border-t border-[#4a6850]/10 bg-white">
          <div className="flex gap-4">
            {step > 1 && (
              <Button
                variant="secondary"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 h-14 rounded-3xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black border-0 shadow-lg hover:shadow-xl transition-all"
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
              >
                Continue <ChevronRight className="w-5 h-5 ml-2 font-bold" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed()}
                className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
              >
                Record Payment
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RecordPaymentSheet;
