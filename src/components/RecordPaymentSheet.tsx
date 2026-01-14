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
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="flex-shrink-0 mb-4">
          <SheetTitle className="text-center">
            {step === 1 && "Select Group"}
            {step === 2 && "Who Paid You?"}
            {step === 3 && "Payment Details"}
          </SheetTitle>
          <SheetDescription className="text-center text-sm text-gray-500">
            Record a payment received from a group member
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
          {/* Step 1: Select Group */}
          {step === 1 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-muted-foreground mb-4">
                Which group is this payment from?
              </p>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                    selectedGroup === group.id
                      ? "bg-positive/10 border-2 border-positive"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
                    {group.emoji}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium">{group.name}</span>
                    <p className="text-sm text-muted-foreground">
                      {group.members.length} members
                    </p>
                  </div>
                  {selectedGroup === group.id && (
                    <div className="w-6 h-6 rounded-full bg-positive flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Who paid you */}
          {step === 2 && (
            <div className="animate-fade-in">
              {selectedGroupData && (
                <div className="inline-flex items-center gap-2 bg-secondary rounded-full px-3 py-1 mb-4">
                  <span>{selectedGroupData.emoji}</span>
                  <span className="text-sm font-medium">{selectedGroupData.name}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-4">
                Who sent you money?
              </p>
              <div className="space-y-2">
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
                        "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                        fromMember === member.id
                          ? "bg-positive/10 border-2 border-positive"
                          : "bg-secondary hover:bg-secondary/80"
                      )}
                    >
                      <Avatar name={member.name} />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {isSettled ? (
                            "✅ All settled"
                          ) : owesYou ? (
                            <span className="text-green-400">Owes you Rs {settlement.toReceive.toLocaleString()}</span>
                          ) : youOwe ? (
                            <span className="text-red-400">You owe Rs {settlement.toPay.toLocaleString()}</span>
                          ) : (
                            "No pending settlements"
                          )}
                        </div>
                      </div>
                      {fromMember === member.id && (
                        <div className="w-6 h-6 rounded-full bg-positive flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Amount and details */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              {/* Member Details Card */}
              {selectedMemberData && (
                <div className="glass-card p-4 bg-emerald-50 border-emerald-200">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar name={selectedMemberData.name} size="md" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{selectedMemberData.name}</h3>
                      <div className="text-sm text-muted-foreground">
                        {selectedMemberData.settlement.toReceive > 0 ? (
                          <span className="text-green-400">
                            💰 Owes you Rs {selectedMemberData.settlement.toReceive.toLocaleString()}
                          </span>
                        ) : selectedMemberData.settlement.toPay > 0 ? (
                          <span className="text-red-400">
                            💸 You owe Rs {selectedMemberData.settlement.toPay.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-600">✅ All settled up</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Details */}
                  {selectedMemberData.paymentDetails && Object.keys(selectedMemberData.paymentDetails).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-600">Payment Details</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {selectedMemberData.paymentDetails.jazzCash && (
                          <div>
                            <span className="text-muted-foreground">JazzCash:</span>
                            <div className="font-mono text-foreground">{selectedMemberData.paymentDetails.jazzCash}</div>
                          </div>
                        )}
                        {selectedMemberData.paymentDetails.easypaisa && (
                          <div>
                            <span className="text-muted-foreground">Easypaisa:</span>
                            <div className="font-mono text-foreground">{selectedMemberData.paymentDetails.easypaisa}</div>
                          </div>
                        )}
                        {selectedMemberData.paymentDetails.bankName && (
                          <div>
                            <span className="text-muted-foreground">Bank:</span>
                            <div className="font-mono text-foreground">{selectedMemberData.paymentDetails.bankName}</div>
                          </div>
                        )}
                        {selectedMemberData.paymentDetails.accountNumber && (
                          <div>
                            <span className="text-muted-foreground">Account:</span>
                            <div className="font-mono text-foreground">{selectedMemberData.paymentDetails.accountNumber}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Amount Suggestion */}
                  {selectedMemberData.settlement.toReceive > 0 && (
                    <div className="mt-3 pt-3 border-t border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-600">Quick Fill</span>
                      </div>
                      <button
                        onClick={() => setAmount(selectedMemberData.settlement.toReceive.toString())}
                        className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        Full Amount: Rs {selectedMemberData.settlement.toReceive.toLocaleString()}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 block">
                  Amount received from {selectedMemberName}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    Rs
                  </span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-2xl h-16 pl-12 font-semibold"
                    autoFocus
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-sm font-medium text-muted-foreground">
                    Payment method
                  </label>
                  <Tooltip 
                    content="Select how you received the payment. This helps track different payment methods for your records."
                    position="top"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMethod("cash")}
                    className={cn(
                      "flex items-center justify-center gap-3 p-4 rounded-xl transition-all",
                      method === "cash"
                        ? "bg-positive/10 border-2 border-positive"
                        : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    <Banknote className={cn(
                      "w-5 h-5",
                      method === "cash" ? "text-positive" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "font-medium",
                      method === "cash" ? "text-positive" : "text-foreground"
                    )}>Cash</span>
                  </button>
                  
                  <button
                    onClick={() => setMethod("online")}
                    className={cn(
                      "flex items-center justify-center gap-3 p-4 rounded-xl transition-all",
                      method === "online"
                        ? "bg-positive/10 border-2 border-positive"
                        : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    <Smartphone className={cn(
                      "w-5 h-5",
                      method === "online" ? "text-positive" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "font-medium",
                      method === "online" ? "text-positive" : "text-foreground"
                    )}>Online</span>
                  </button>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 block">
                  Note (optional)
                </label>
                <Input
                  placeholder="e.g., Mess payment for January"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-12"
                />
              </div>

              {/* Summary */}
              {parseFloat(amount) > 0 && (
                <div className="bg-positive/5 border border-positive/20 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedMemberName || ""} />
                    <div>
                      <div className="font-semibold text-positive">
                        +Rs {amount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        from {selectedMemberName} • {method}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-4 border-t bg-background">
          <div className="flex gap-3">
            {step > 1 && (
              <Button
                variant="secondary"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 h-12"
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex-1 h-12 bg-positive hover:bg-positive/90"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed()}
                className="w-full h-12 bg-positive hover:bg-positive/90"
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
