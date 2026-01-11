import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronRight } from "lucide-react";
import Avatar from "./Avatar";
import { cn } from "@/lib/utils";

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

    const perPerson = Math.round(totalAmount / splitCount);
    const paidByMember = members.find((m) => m.id === paidBy);
    const isPaidByYou = paidByMember?.name === "You";
    const youParticipated = participants.some(
      (id) => members.find((m) => m.id === id)?.name === "You"
    );

    if (isPaidByYou) {
      // You paid, so you receive from others
      const othersCount = youParticipated ? splitCount - 1 : splitCount;
      const toReceive = perPerson * othersCount;
      return { perPerson, toReceive, toGive: 0, othersCount };
    } else {
      // Someone else paid, you may owe them
      if (youParticipated) {
        return { perPerson, toReceive: 0, toGive: perPerson, othersCount: 0 };
      }
      return { perPerson, toReceive: 0, toGive: 0, othersCount: 0 };
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
    onClose();
  };

  const handleSubmit = () => {
    onSubmit({
      groupId: selectedGroup,
      amount: parseFloat(amount),
      paidBy,
      participants,
      note,
      place,
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
    if (step === 2) return parseFloat(amount) > 0;
    if (step === 3) return paidBy !== "";
    if (step === 4) return participants.length > 0;
    return true;
  };

  const paidByName = members.find((m) => m.id === paidBy)?.name;
  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-center">
            {step === 1 && "Select Group"}
            {step === 2 && "Enter Amount"}
            {step === 3 && "Who Paid?"}
            {step === 4 && "Split Between"}
            {step === 5 && "Add Details"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Select Group */}
          {step === 1 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-muted-foreground mb-4">
                Which group is this expense for?
              </p>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                    selectedGroup === group.id
                      ? "bg-primary/10 border-2 border-primary"
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
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Enter Amount */}
          {step === 2 && (
            <div className="text-center py-8 animate-fade-in">
              {selectedGroupData && (
                <div className="inline-flex items-center gap-2 bg-secondary rounded-full px-3 py-1 mb-4">
                  <span>{selectedGroupData.emoji}</span>
                  <span className="text-sm font-medium">{selectedGroupData.name}</span>
                </div>
              )}
              <div className="text-6xl font-bold text-foreground mb-4">
                Rs {amount || "0"}
              </div>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-center text-2xl h-14 max-w-xs mx-auto"
                autoFocus
              />
            </div>
          )}

          {/* Step 3: Who Paid */}
          {step === 3 && (
            <div className="space-y-3 animate-fade-in">
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setPaidBy(member.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                    paidBy === member.id
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <Avatar name={member.name} />
                  <span className="font-medium flex-1 text-left">{member.name}</span>
                  {paidBy === member.id && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Split Between */}
          {step === 4 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-muted-foreground mb-4">
                Select everyone who shared this expense (including who paid)
              </p>
              {members.map((member) => {
                const isSelected = participants.includes(member.id);
                
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleParticipant(member.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                      isSelected
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    <Avatar name={member.name} />
                    <div className="flex-1 text-left">
                      <span className="font-medium">{member.name}</span>
                      {isSelected && (
                        <div className="text-sm text-muted-foreground">
                          Rs {splitDetails.perPerson} share
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Split Summary */}
              {participants.length > 0 && paidBy && (
                <div className="bg-secondary rounded-xl p-4 mt-4">
                  <div className="text-sm text-muted-foreground mb-2">Split Summary</div>
                  <div className="text-lg font-semibold">
                    Rs {splitDetails.perPerson} per person
                  </div>
                  {splitDetails.toReceive > 0 && (
                    <div className="text-positive font-medium mt-1">
                      You will receive Rs {splitDetails.toReceive} from {splitDetails.othersCount} {splitDetails.othersCount === 1 ? 'person' : 'people'}
                    </div>
                  )}
                  {splitDetails.toGive > 0 && (
                    <div className="text-negative font-medium mt-1">
                      You owe Rs {splitDetails.toGive} to {paidByName}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Add Details */}
          {step === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  What was it for? (optional)
                </label>
                <Input
                  placeholder="e.g., Dinner, Chai, Groceries"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-12"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Where? (optional)
                </label>
                <Input
                  placeholder="e.g., Student Café"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  className="h-12"
                  maxLength={100}
                />
              </div>
              
              <div className="bg-secondary rounded-xl p-4 mt-6">
                <div className="text-sm text-muted-foreground mb-2">Summary</div>
                <div className="font-semibold text-lg">Rs {amount}</div>
                <div className="text-sm text-muted-foreground">
                  Paid by {paidByName} • Split {participants.length} ways
                </div>
                <div className="text-sm text-muted-foreground">
                  Rs {splitDetails.perPerson} per person
                </div>
                {splitDetails.toReceive > 0 && (
                  <div className="text-positive font-medium mt-2">
                    You will receive Rs {splitDetails.toReceive}
                  </div>
                )}
                {splitDetails.toGive > 0 && (
                  <div className="text-negative font-medium mt-2">
                    You owe Rs {splitDetails.toGive}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t mt-auto">
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
            {step < 5 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex-1 h-12"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="flex-1 h-12">
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
