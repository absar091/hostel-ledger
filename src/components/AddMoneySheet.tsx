import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, PiggyBank } from "lucide-react";
import Tooltip from "./Tooltip";

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
      <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl flex flex-col bg-white">
        <SheetHeader className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-center gap-2">
            <SheetTitle className="text-center flex items-center justify-center gap-2 text-gray-900">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
              Add to Available Budget
            </SheetTitle>
            <Tooltip 
              content="Add money to your wallet balance. This represents actual money you have available to spend on group expenses."
              position="bottom"
            />
          </div>
          <SheetDescription className="text-sm text-gray-500 text-center">
            Add actual money to your wallet for expense tracking
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
          {/* Amount Input */}
          <div className="text-center">
            <div className="text-6xl font-bold text-gray-900 mb-4">
              Rs {amount || "0"}
            </div>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-center text-2xl h-14 max-w-xs mx-auto bg-gray-50 border-gray-200"
              autoFocus
            />
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-3 block">
              Quick amounts
            </label>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-center border border-gray-100"
                >
                  <div className="font-semibold text-gray-900">Rs {quickAmount.toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-3 block">
              Note (optional)
            </label>
            <Input
              placeholder="e.g., Monthly allowance, Salary, Pocket money"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-12 bg-gray-50 border-gray-200"
              maxLength={100}
            />
          </div>

          {/* Info Box */}
          <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-100">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Available Budget Tracking</h4>
                <p className="text-sm text-gray-600">
                  This adds to your Available Budget (real money). When you pay for group expenses, 
                  the full amount will be deducted from this balance.
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {parseFloat(amount) > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-emerald-700 text-lg">
                    +Rs {parseFloat(amount).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Added to Available Budget
                  </div>
                </div>
                <PiggyBank className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-4 border-t border-gray-100 bg-white">
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
              className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
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