import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, CreditCard, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddMoneySheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number, method: string, note?: string) => void;
}

const AddMoneySheet = ({ open, onClose, onSubmit }: AddMoneySheetProps) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bank" | "cash" | "card">("bank");
  const [note, setNote] = useState("");

  const handleClose = () => {
    setAmount("");
    setMethod("bank");
    setNote("");
    onClose();
  };

  const handleSubmit = () => {
    const amountValue = parseFloat(amount);
    
    if (isNaN(amountValue) || amountValue <= 0) {
      return;
    }

    onSubmit(amountValue, method, note.trim() || undefined);
    handleClose();
  };

  const canSubmit = () => {
    const amountValue = parseFloat(amount);
    return amountValue > 0 && !isNaN(amountValue);
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-center flex items-center justify-center gap-2">
            <Wallet className="w-5 h-5" />
            Add Money to Wallet
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Amount Input */}
          <div className="text-center">
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

          {/* Quick Amount Buttons */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Quick amounts
            </label>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  className="p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-center"
                >
                  <div className="font-semibold">Rs {quickAmount.toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Payment method
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setMethod("bank")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                  method === "bank"
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <Wallet className={cn(
                  "w-6 h-6",
                  method === "bank" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  method === "bank" ? "text-primary" : "text-foreground"
                )}>Bank Transfer</span>
              </button>
              
              <button
                onClick={() => setMethod("card")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                  method === "card"
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <CreditCard className={cn(
                  "w-6 h-6",
                  method === "card" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  method === "card" ? "text-primary" : "text-foreground"
                )}>Card</span>
              </button>

              <button
                onClick={() => setMethod("cash")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                  method === "cash"
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <Banknote className={cn(
                  "w-6 h-6",
                  method === "cash" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  method === "cash" ? "text-primary" : "text-foreground"
                )}>Cash Deposit</span>
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Note (optional)
            </label>
            <Input
              placeholder="e.g., Monthly allowance, Salary"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-12"
              maxLength={100}
            />
          </div>

          {/* Summary */}
          {parseFloat(amount) > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-primary text-lg">
                    +Rs {parseFloat(amount).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    via {method === "bank" ? "Bank Transfer" : method === "card" ? "Card" : "Cash Deposit"}
                  </div>
                </div>
                <Wallet className="w-8 h-8 text-primary" />
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t bg-background">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit()}
              className="flex-1 h-12"
            >
              Add Money
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddMoneySheet;