import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronRight, AlertCircle, WifiOff } from "lucide-react";
import Avatar from "./Avatar";
import Tooltip from "./Tooltip";
import { cn } from "@/lib/utils";
import { saveOfflineExpense } from "@/lib/offlineDB";
import { useOffline } from "@/hooks/useOffline";
import { toast } from "sonner";
// import { validateExpenseData, sanitizeString, sanitizeAmount } from "@/lib/validation";

interface Member {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  emoji: string;
  members: Member[];
}

interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  onSubmit: (data: {
    groupId: string;
    amount: number;
    paidBy: string;
    participants: string[];
    note: string;
    place: string;
  }) => void;
}

const AddExpenseSheet = ({ open, onClose, groups, onSubmit }: AddExpenseSheetProps) => {
  const [step, setStep] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [place, setPlace] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { offline, updatePendingCount } = useOffline();

  // Get members from selected group
  const members = useMemo(() => {
    const group = groups.find((g) => g.id === selectedGroup);
    return group?.members || [];
  }, [groups, selectedGroup]);

  // Auto-select group if only one exists
  useEffect(() => {
    if (open && groups.length === 1) {
      setSelectedGroup(groups[0].id);
      setStep(2);
    }
  }, [open, groups]);

  // Calculate split details
  const splitDetails = useMemo(() => {
    const totalAmount = parseFloat(amount) || 0;
    const splitCount = participants.length;

    if (splitCount === 0 || totalAmount === 0) {
      return { perPerson: 0, toReceive: 0, toGive: 0, othersCount: 0 };
    }

    // Use same calculation as backend for consistency
    const baseAmount = Math.floor(totalAmount / splitCount);
    const remainder = totalAmount % splitCount;

    // Most people get baseAmount, first 'remainder' people get baseAmount + 1
    const perPersonAmounts = Array.from({ length: splitCount }, (_, index) =>
      baseAmount + (index < remainder ? 1 : 0)
    );

    const paidByMember = members.find((m) => m.id === paidBy);
    const isPaidByYou = paidByMember?.name === "You";
    const youParticipated = participants.some(
      (id) => members.find((m) => m.id === id)?.name === "You"
    );

    if (isPaidByYou) {
      // You paid, so you receive from others
      const payerIndex = participants.findIndex(id => members.find(m => m.id === id)?.name === "You");
      const yourShare = payerIndex >= 0 ? perPersonAmounts[payerIndex] : 0;
      const othersTotal = totalAmount - yourShare;
      const othersCount = youParticipated ? splitCount - 1 : splitCount;

      return {
        perPerson: baseAmount, // Show base amount for display
        actualAmounts: perPersonAmounts,
        toReceive: othersTotal,
        toGive: 0,
        othersCount
      };
    } else {
      // Someone else paid, you may owe them
      if (youParticipated) {
        const yourIndex = participants.findIndex(id => members.find(m => m.id === id)?.name === "You");
        const yourShare = yourIndex >= 0 ? perPersonAmounts[yourIndex] : baseAmount;
        return {
          perPerson: baseAmount,
          actualAmounts: perPersonAmounts,
          toReceive: 0,
          toGive: yourShare,
          othersCount: 0
        };
      }
      return {
        perPerson: baseAmount,
        actualAmounts: perPersonAmounts,
        toReceive: 0,
        toGive: 0,
        othersCount: 0
      };
    }
  }, [amount, paidBy, participants, members]);

  const handleClose = () => {
    setStep(groups.length === 1 ? 2 : 1);
    setSelectedGroup(groups.length === 1 ? groups[0]?.id || "" : "");
    setAmount("");
    setPaidBy("");
    setParticipants([]);
    setNote("");
    setPlace("");
    setValidationErrors([]);
    onClose();
  };

  const handleSubmit = async () => {
    // Comprehensive validation before submission
    const expenseData = {
      groupId: selectedGroup,
      amount: parseFloat(amount),
      paidBy,
      participants,
      note: note.trim().substring(0, 200),
      place: place.trim().substring(0, 100),
    };

    // Basic validation
    const errors: string[] = [];
    if (!selectedGroup) errors.push('Group is required');
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) errors.push('Amount must be a positive number');
    if (!paidBy) errors.push('Please select who paid');
    if (participants.length === 0) errors.push('Please select at least one participant');

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Additional business logic validation
    const members = groups.find(g => g.id === selectedGroup)?.members || [];
    const payerExists = members.some(m => m.id === paidBy);
    if (!payerExists) {
      setValidationErrors(["Selected payer is not valid"]);
      return;
    }

    const invalidParticipants = participants.filter(p => !members.some(m => m.id === p));
    if (invalidParticipants.length > 0) {
      setValidationErrors(["Some selected participants are not valid"]);
      return;
    }

    // Clear errors
    setValidationErrors([]);

    // OFFLINE MODE: Save to IndexedDB
    if (offline) {
      try {
        await saveOfflineExpense({
          groupId: selectedGroup,
          amount: Math.max(0, Math.min(parseFloat(amount), 1000000)),
          paidBy,
          participants,
          note: note.trim().substring(0, 200),
          place: place.trim().substring(0, 100),
        });

        await updatePendingCount();
        toast.success("Saved offline — will sync when online", {
          description: "Your expense is saved locally and will sync automatically",
          icon: "📴",
        });
        handleClose();
      } catch (error: any) {
        toast.error("Failed to save offline", {
          description: error.message || "Please try again",
        });
      }
      return;
    }

    // ONLINE MODE: Submit normally
    onSubmit({
      groupId: selectedGroup,
      amount: Math.max(0, Math.min(parseFloat(amount), 1000000)),
      paidBy,
      participants,
      note: note.trim().substring(0, 200),
      place: place.trim().substring(0, 100),
    });
    handleClose();
  };

  const toggleParticipant = (id: string) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    if (step === 1) return selectedGroup !== "";
    if (step === 2) {
      const amountValue = parseFloat(amount);
      return amountValue > 0 && !isNaN(amountValue);
    }
    if (step === 3) return paidBy !== "";
    if (step === 4) return participants.length > 0;
    return true;
  };

  const paidByName = members.find((m) => m.id === paidBy)?.name;
  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 z-[100]">
        <SheetHeader className="flex-shrink-0 mb-6 pt-2">
          {/* Handle Bar */}
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>

          {/* Offline Indicator */}
          {offline && (
            <div className="mx-auto mb-4 inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-2">
              <WifiOff className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-bold text-orange-700">Offline Mode - Will sync later</span>
            </div>
          )}

          <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">
            {step === 1 && "Select Group"}
            {step === 2 && "Enter Amount"}
            {step === 3 && "Who Paid?"}
            {step === 4 && "Split Between"}
            {step === 5 && "Add Details"}
          </SheetTitle>
          <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
            Add a new expense to split between group members
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Validation Errors - iPhone Style */}
          {validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200/50 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-black text-red-800">Please fix the following errors:</span>
              </div>
              <ul className="text-sm text-red-700 space-y-2">
                {validationErrors.map((error, index) => (
                  <li key={index} className="font-bold">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 1: Select Group - iPhone Style */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-sm text-[#4a6850]/80 mb-6 text-center font-bold">
                Which group is this expense for?
              </p>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-5 rounded-3xl transition-all shadow-lg hover:shadow-xl active:scale-95",
                    selectedGroup === group.id
                      ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                      : "bg-white border-2 border-gray-200 hover:border-[#4a6850]/30 hover:bg-[#4a6850]/5"
                  )}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 flex items-center justify-center text-2xl shadow-sm">
                    {group.emoji}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-black text-gray-900 tracking-tight">{group.name}</span>
                    <p className="text-sm text-[#4a6850]/80 font-bold">
                      {group.members.length} members
                    </p>
                  </div>
                  {selectedGroup === group.id && (
                    <div className="w-7 h-7 rounded-full bg-[#4a6850] flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-white font-bold" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Enter Amount - iPhone Style */}
          {step === 2 && (
            <div className="text-center py-12 animate-fade-in">
              {selectedGroupData && (
                <div className="inline-flex items-center gap-3 bg-[#4a6850]/10 rounded-3xl px-5 py-3 mb-8 border border-[#4a6850]/20">
                  <span className="text-2xl">{selectedGroupData.emoji}</span>
                  <span className="text-sm font-black text-[#4a6850]">{selectedGroupData.name}</span>
                </div>
              )}
              <div className="text-4xl font-black text-gray-900 mb-8 tracking-tighter tabular-nums">
                Rs {amount || "0"}
              </div>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-center text-xl h-14 max-w-sm mx-auto rounded-3xl border-2 border-[#4a6850]/30 shadow-lg font-black text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:ring-0 focus:shadow-xl"
                autoFocus
              />
            </div>
          )}

          {/* Step 3: Who Paid - iPhone Style */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 justify-center mb-6">
                <p className="text-sm text-[#4a6850]/80 font-bold text-center">Select who paid for this expense</p>
                <Tooltip
                  content="Choose the person who actually paid the money upfront. The app will calculate how much others owe them."
                  position="bottom"
                />
              </div>
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setPaidBy(member.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-5 rounded-3xl transition-all shadow-lg hover:shadow-xl active:scale-95",
                    paidBy === member.id
                      ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                      : "bg-white border-2 border-gray-200 hover:border-[#4a6850]/30 hover:bg-[#4a6850]/5"
                  )}
                >
                  <Avatar name={member.name} />
                  <span className="font-black flex-1 text-left text-gray-900 tracking-tight">{member.name}</span>
                  {paidBy === member.id && (
                    <div className="w-7 h-7 rounded-full bg-[#4a6850] flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-white font-bold" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Split Between - iPhone Style */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 justify-center mb-6">
                <p className="text-sm text-[#4a6850]/80 font-bold text-center">
                  Select everyone who shared this expense (including who paid)
                </p>
                <Tooltip
                  content="Choose all people who should split this cost. The expense will be divided equally among selected members."
                  position="bottom"
                />
              </div>
              {members.map((member) => {
                const isSelected = participants.includes(member.id);

                return (
                  <button
                    key={member.id}
                    onClick={() => toggleParticipant(member.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-5 rounded-3xl transition-all shadow-lg hover:shadow-xl active:scale-95",
                      isSelected
                        ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                        : "bg-white border-2 border-gray-200 hover:border-[#4a6850]/30 hover:bg-[#4a6850]/5"
                    )}
                  >
                    <Avatar name={member.name} />
                    <div className="flex-1 text-left">
                      <span className="font-black text-gray-900 tracking-tight">{member.name}</span>
                      {isSelected && (
                        <div className="text-sm text-[#4a6850] font-bold">
                          Rs {splitDetails.perPerson} share
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-7 h-7 rounded-full bg-[#4a6850] flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-white font-bold" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Split Summary - iPhone Style */}
              {participants.length > 0 && paidBy && (
                <div className="bg-gradient-to-r from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl p-6 mt-6 border border-[#4a6850]/20 shadow-lg">
                  <div className="text-sm text-[#4a6850]/80 mb-3 font-black uppercase tracking-wide">Split Summary</div>
                  <div className="text-xl font-black text-gray-900 tracking-tight">
                    Rs {splitDetails.perPerson} per person
                  </div>
                  {splitDetails.toReceive > 0 && (
                    <div className="text-[#4a6850] font-black mt-3 text-lg">
                      You will receive Rs {splitDetails.toReceive} from {splitDetails.othersCount} {splitDetails.othersCount === 1 ? 'person' : 'people'}
                    </div>
                  )}
                  {splitDetails.toGive > 0 && (
                    <div className="text-red-600 font-black mt-3 text-lg">
                      You owe Rs {splitDetails.toGive} to {paidByName}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Add Details - iPhone Style */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">
                  What was it for? (optional)
                </label>
                <Input
                  placeholder="e.g., Dinner, Chai, Groceries"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">
                  Where? (optional)
                </label>
                <Input
                  placeholder="e.g., Student Café"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  className="h-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl"
                  maxLength={100}
                />
              </div>

              {/* Final Summary - iPhone Style */}
              <div className="bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl p-6 mt-8 shadow-[0_25px_70px_rgba(74,104,80,0.3)] text-white">
                <div className="text-sm text-white/90 mb-3 font-black uppercase tracking-wide">Final Summary</div>
                <div className="font-black text-xl tracking-tight mb-2">Rs {amount}</div>
                <div className="text-sm text-white/90 font-bold">
                  Paid by {paidByName} • Split {participants.length} ways
                </div>
                <div className="text-sm text-white/90 font-bold">
                  Rs {splitDetails.perPerson} per person
                </div>
                {splitDetails.toReceive > 0 && (
                  <div className="text-emerald-200 font-black mt-3 text-lg">
                    You will receive Rs {splitDetails.toReceive}
                  </div>
                )}
                {splitDetails.toGive > 0 && (
                  <div className="text-orange-200 font-black mt-3 text-lg">
                    You owe Rs {splitDetails.toGive}
                  </div>
                )}
              </div>
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
            {step < 5 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight className="w-5 h-5 ml-2 font-bold" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all"
              >
                Add Expense
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddExpenseSheet;
