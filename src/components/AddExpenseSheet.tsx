import { useState } from "react";
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

interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  members: Member[];
  onSubmit: (data: {
    amount: number;
    paidBy: string;
    participants: string[];
    note: string;
    place: string;
  }) => void;
}

const AddExpenseSheet = ({ open, onClose, members, onSubmit }: AddExpenseSheetProps) => {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [place, setPlace] = useState("");

  const handleClose = () => {
    setStep(1);
    setAmount("");
    setPaidBy("");
    setParticipants([]);
    setNote("");
    setPlace("");
    onClose();
  };

  const handleSubmit = () => {
    onSubmit({
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
    if (step === 1) return parseFloat(amount) > 0;
    if (step === 2) return paidBy !== "";
    if (step === 3) return participants.length > 0;
    return true;
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-center">
            {step === 1 && "Enter Amount"}
            {step === 2 && "Who Paid?"}
            {step === 3 && "Split Between"}
            {step === 4 && "Add Details"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="text-center py-8 animate-fade-in">
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

          {step === 2 && (
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

          {step === 3 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-muted-foreground mb-4">
                Select everyone who shared this expense
              </p>
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => toggleParticipant(member.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                    participants.includes(member.id)
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <Avatar name={member.name} />
                  <span className="font-medium flex-1 text-left">{member.name}</span>
                  {participants.includes(member.id) && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
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
                />
              </div>
              
              <div className="bg-secondary rounded-xl p-4 mt-6">
                <div className="text-sm text-muted-foreground mb-2">Summary</div>
                <div className="font-semibold text-lg">Rs {amount}</div>
                <div className="text-sm text-muted-foreground">
                  Paid by {members.find((m) => m.id === paidBy)?.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Split between {participants.length} people
                </div>
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
            {step < 4 ? (
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
