import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Banknote, Smartphone } from "lucide-react";
import Avatar from "./Avatar";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
}

interface RecordPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  members: Member[];
  onSubmit: (data: {
    fromMember: string;
    amount: number;
    method: "cash" | "online";
    note: string;
  }) => void;
}

const RecordPaymentSheet = ({ open, onClose, members, onSubmit }: RecordPaymentSheetProps) => {
  const [fromMember, setFromMember] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "online">("cash");
  const [note, setNote] = useState("");

  const handleClose = () => {
    setFromMember("");
    setAmount("");
    setMethod("cash");
    setNote("");
    onClose();
  };

  const handleSubmit = () => {
    onSubmit({
      fromMember,
      amount: parseFloat(amount),
      method,
      note,
    });
    handleClose();
  };

  const canSubmit = fromMember !== "" && parseFloat(amount) > 0;

  // Filter out "You" from members since you're receiving from others
  const otherMembers = members.filter((m) => m.name !== "You");

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-center">Record Payment Received</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Who paid you */}
          <div className="animate-fade-in">
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Who paid you?
            </label>
            <div className="space-y-2">
              {otherMembers.map((member) => (
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
                  <span className="font-medium flex-1 text-left">{member.name}</span>
                  {fromMember === member.id && (
                    <div className="w-6 h-6 rounded-full bg-positive flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Amount received
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
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Payment method (optional)
            </label>
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
          <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
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
          {fromMember && parseFloat(amount) > 0 && (
            <div className="bg-positive/5 border border-positive/20 rounded-xl p-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <Avatar name={otherMembers.find((m) => m.id === fromMember)?.name || ""} />
                <div>
                  <div className="font-semibold text-positive">
                    +Rs {amount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    from {otherMembers.find((m) => m.id === fromMember)?.name} • {method}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t mt-auto">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 bg-positive hover:bg-positive/90"
          >
            Record Payment
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RecordPaymentSheet;
