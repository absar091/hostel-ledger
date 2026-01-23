import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, PiggyBank } from "lucide-react";
import Tooltip from "./Tooltip";
import { toast } from "sonner";

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
      toast.error("Please enter a valid amount greater than zero");
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
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 shadow-[0_-20px_60px_rgba(74,104,80,0.1)] z-[100]">
        <SheetHeader className="flex-shrink-0 mb-6 pt-2">
          {/* Handle Bar */}
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>

          <div className="flex items-center justify-center gap-3">
            <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-3">
              <PiggyBank className="w-7 h-7 text-[#4a6850]" />
              Add to Available Budget
            </SheetTitle>
            <Tooltip
              content="Add money to your wallet balance. This represents actual money you have available to spend on group expenses."
              position="bottom"
            />
          </div>
          <SheetDescription className="text-sm text-[#4a6850]/80 text-center font-bold">
            Add actual money to your wallet for expense tracking
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Amount Input - iPhone Style */}
          <div className="text-center py-8">
            <div className="text-4xl font-black text-gray-900 mb-6 tracking-tighter tabular-nums">
              Rs {amount || "0"}
            </div>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-center text-xl h-14 max-w-sm mx-auto rounded-3xl border-[#4a6850]/20 shadow-lg font-black text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl"
              autoFocus
            />
          </div>

          {/* Quick Amount Buttons - iPhone Style */}
          <div className="mb-8">
            <label className="text-sm font-black text-[#4a6850]/80 mb-4 block uppercase tracking-wide">
              Quick amounts
            </label>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  className="p-4 rounded-3xl bg-white hover:bg-[#4a6850]/5 transition-all text-center border border-[#4a6850]/10 shadow-lg hover:shadow-xl hover:border-[#4a6850]/20"
                >
                  <div className="font-black text-gray-900 tracking-tight">Rs {quickAmount.toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Note - iPhone Style */}
          <div className="mb-8">
            <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">
              Note (optional)
            </label>
            <Input
              placeholder="e.g., Monthly allowance, Salary, Pocket money"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl"
              maxLength={100}
            />
          </div>

          {/* Info Box - iPhone Style */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 border border-[#4a6850]/20 shadow-lg mb-6">
            <div className="flex items-start gap-4">
              <Wallet className="w-6 h-6 text-[#4a6850] mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-black text-gray-900 mb-2 tracking-tight">Available Budget Tracking</h4>
                <p className="text-sm text-[#4a6850]/80 font-bold leading-relaxed">
                  This adds to your Available Budget (real money). When you pay for group expenses,
                  the full amount will be deducted from this balance.
                </p>
              </div>
            </div>
          </div>

          {/* Summary - iPhone Style */}
          {parseFloat(amount) > 0 && (
            <div className="bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl p-6 shadow-[0_25px_70px_rgba(74,104,80,0.3)] text-white animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-black text-white text-xl tracking-tight tabular-nums">
                    +Rs {parseFloat(amount).toLocaleString()}
                  </div>
                  <div className="text-sm text-white/90 font-bold">
                    Added to Available Budget
                  </div>
                </div>
                <PiggyBank className="w-10 h-10 text-white/90" />
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-6 border-t border-[#4a6850]/10 bg-white">
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={handleClose}
              className="flex-1 h-14 rounded-3xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black border-0 shadow-lg hover:shadow-xl transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit()}
              className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
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