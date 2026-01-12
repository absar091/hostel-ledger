import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, PiggyBank } from "lucide-react";

interface AddMoneySheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number, note?: string) => void;
}

const AddMoneySheet = ({ open, onClose, onSubmit }: AddMoneySheetProps) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const handleClose = () => {
    setAmount("");
    setNote("");
    onClose();
  };

  const handleSubmit = () => {
    const amountValue = parseFloat(amount);
    
    if (isNaN(amountValue) || amountValue <= 0) {
      return;
    }

    onSubmit(amountValue, note.trim() || undefined);
    handleClose();
  };

  const canSubmit = () => {
    const amountValue = parseFloat(amount);
    return amountValue > 0 && !isNaN(amountValue);
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="flex-shrink-0 mb-6">
          <SheetTitle className="text-center flex items-center justify-center gap-2">
            <PiggyBank className="w-5 h-5" />
            Add to Available Budget
          </SheetTitle>
          <div className="sr-only">
            Add money to your wallet for expense tracking
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Add actual money to your wallet for expense tracking
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
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

          {/* Note */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Note (optional)
            </label>
            <Input
              placeholder="e.g., Monthly allowance, Salary, Pocket money"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-12"
              maxLength={100}
            />
          </div>

          {/* Info Box */}
          <div className="glass-card p-4 bg-teal-500/10 border-teal-500/20">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-teal-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground mb-1">Available Budget Tracking</h4>
                <p className="text-sm text-muted-foreground">
                  This adds to your Available Budget (real money). When you pay for group expenses, 
                  the full amount will be deducted from this balance.
                </p>
              </div>
            </div>
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
                    Added to Available Budget
                  </div>
                </div>
                <PiggyBank className="w-8 h-8 text-primary" />
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-4 border-t bg-background">
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
              Add to Available Budget
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddMoneySheet;