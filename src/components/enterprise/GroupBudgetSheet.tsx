import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Calendar, AlertCircle, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Group } from "@/contexts/FirebaseDataContext";

import { useCurrency } from "@/contexts/CurrencyContext";

interface GroupBudgetSheetProps {
  open: boolean;
  onClose: () => void;
  group: Group;
  onUpdateBudget: (budget: Group['budget']) => Promise<{ success: boolean; error?: string }>;
}

const GroupBudgetSheet = ({ open, onClose, group, onUpdateBudget }: GroupBudgetSheetProps) => {
  const { symbol } = useCurrency();
  const [amount, setAmount] = useState<string>(group?.budget?.amount?.toString() || "");
  const [period, setPeriod] = useState<'monthly' | 'weekly'>(group?.budget?.period || "monthly");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (group?.budget) {
      setAmount(group.budget.amount.toString());
      setPeriod(group.budget.period);
    } else {
      setAmount("");
      setPeriod("monthly");
    }
  }, [group?.budget, open]);

  if (!group) return null;

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    setIsSaving(true);
    const result = await onUpdateBudget({
      amount: numAmount,
      period,
      lastUpdated: new Date().toISOString()
    });

    setIsSaving(false);
    if (result.success) {
      toast.success("Budget updated successfully");
      onClose();
    } else {
      toast.error(result.error || "Failed to update budget");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[auto] max-h-[90vh] rounded-t-[32px] p-0 overflow-hidden border-t-0 shadow-2xl flex flex-col bg-white">
        <div className="w-12 h-1.5 bg-gray-300/50 rounded-full mx-auto mt-4 absolute top-0 left-1/2 -translate-x-1/2 z-10" />

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-10 pt-12 text-white shrink-0">
          <SheetHeader className="text-left space-y-3">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-2 backdrop-blur-xl border border-white/20 shadow-inner">
              <Target className="w-7 h-7 text-white" />
            </div>
            <SheetTitle className="text-3xl font-black text-white tracking-tight">Group Budget</SheetTitle>
            <SheetDescription className="text-emerald-50 text-base font-bold opacity-90">
              Set a spending limit for <strong>{group?.name || 'this group'}</strong> to stay on track.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-8 space-y-8 flex-1 overflow-y-auto pb-12">
          <div className="space-y-4">
            <Label htmlFor="budget-amount" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Budget Amount
            </Label>
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400 group-focus-within:text-emerald-600 transition-colors">{symbol}</span>
              <Input
                id="budget-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-12 h-16 text-2xl font-black border-2 border-gray-100 bg-gray-50/50 rounded-[24px] focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Budget Period
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPeriod('monthly')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${
                  period === 'monthly' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' 
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                }`}
              >
                <Calendar className={`w-6 h-6 ${period === 'monthly' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="font-semibold text-sm">Monthly</span>
              </button>
              <button
                type="button"
                onClick={() => setPeriod('weekly')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${
                  period === 'weekly' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' 
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                }`}
              >
                <Calendar className={`w-6 h-6 ${period === 'weekly' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="font-semibold text-sm">Weekly</span>
              </button>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 border border-amber-100/50 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 leading-relaxed font-medium">
              We'll notify the group when spending reaches <strong>80%</strong> of the budget.
            </p>
          </div>

          <div className="pt-6 space-y-4">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full h-16 rounded-[24px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl shadow-xl shadow-emerald-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 border-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Saving Budget...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="w-full h-14 text-gray-400 hover:text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GroupBudgetSheet;
