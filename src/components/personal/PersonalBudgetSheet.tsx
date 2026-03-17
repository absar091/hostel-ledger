import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Calendar, Save, Loader2, Bell, Lock, Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { Switch } from "@/components/ui/switch";
import { useCurrency } from "@/contexts/CurrencyContext";
import { callSecureApi } from "@/lib/api";

interface PersonalBudgetSheetProps {
  open: boolean;
  onClose: () => void;
}

const PersonalBudgetSheet = ({ open, onClose }: PersonalBudgetSheetProps) => {
  const { user } = useFirebaseAuth();
  const { symbol } = useCurrency();
  const [amount, setAmount] = useState<string>(user?.personalBudget?.amount?.toString() || "");
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>(user?.personalBudget?.period || "daily");
  const [alertAt80, setAlertAt80] = useState<boolean>(user?.personalBudget?.policies?.alertAt80 ?? true);
  const [lockAt100, setLockAt100] = useState<boolean>(user?.personalBudget?.policies?.lockAt100 ?? true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.personalBudget) {
      setAmount(user.personalBudget.amount.toString());
      setPeriod(user.personalBudget.period);
      setAlertAt80(user.personalBudget.policies?.alertAt80);
      setLockAt100(user.personalBudget.policies?.lockAt100);
    }
  }, [user?.personalBudget, open]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    setIsSaving(true);
    try {
      const result = await callSecureApi(`/api/budgets/personal/${user?.uid}`, {
        amount: numAmount,
        period,
        policies: {
          alertAt80,
          lockAt100
        }
      });

      if (result.success) {
        toast.success("Personal budget updated!");
        // Trigger budget refresh so dashboard updates immediately
        if ((window as any).__refreshBudget) {
          (window as any).__refreshBudget();
        }
        onClose();
      } else {
        toast.error(result.error || "Failed to update budget");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[auto] max-h-[90vh] rounded-t-[32px] p-0 overflow-hidden border-t-0 shadow-2xl flex flex-col bg-white">
        <div className="w-12 h-1.5 bg-gray-300/50 rounded-full mx-auto mt-4 absolute top-0 left-1/2 -translate-x-1/2 z-10" />

        <div className="p-6 pt-10 sm:p-10 sm:pt-12 text-white shrink-0" style={{ background: 'linear-gradient(145deg, #2D5A47 0%, #1B4332 60%, #1a3a2e 100%)' }}>
          <SheetHeader className="text-left space-y-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-2 backdrop-blur-xl border border-white/20 shadow-inner">
              <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <SheetTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight">Personal Budget</SheetTitle>
            <SheetDescription className="text-emerald-50 text-sm sm:text-base font-bold opacity-90">
              Set a personal spending limit to keep your finances in check.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto pb-8 sm:pb-12 text-left">
          <div className="space-y-4">
            <Label htmlFor="personal-amount" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#4a6850] rounded-full" />
              Budget Amount
            </Label>
            <div className="relative group">
              <span className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-black text-gray-400 group-focus-within:text-[#4a6850] transition-colors">{symbol}</span>
              <Input
                id="personal-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 sm:pl-12 h-14 sm:h-16 text-xl sm:text-2xl font-black border-2 border-gray-100 bg-gray-50/50 rounded-[20px] sm:rounded-[24px] focus:ring-[#4a6850]/20 focus:border-[#4a6850] transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Reset Period
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all gap-1.5 ${
                    period === p 
                      ? 'border-[#4a6850] bg-[#EAF5EF] text-[#4B6B54] shadow-sm' 
                      : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                  }`}
                >
                  <Clock className={`w-5 h-5 ${period === p ? 'text-[#4B6B54]' : 'text-gray-400'}`} />
                  <span className="font-bold text-xs capitalize">{p}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Policies
            </Label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-gray-100 bg-gray-50/30">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Alert at 80%</p>
                    <p className="text-xs text-gray-500 font-medium">Notification when limit is near</p>
                  </div>
                </div>
                <Switch checked={alertAt80} onCheckedChange={setAlertAt80} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-gray-100 bg-gray-50/30">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Lock at 100%</p>
                    <p className="text-xs text-gray-500 font-medium">Block expenses if exceeded</p>
                  </div>
                </div>
                <Switch checked={lockAt100} onCheckedChange={setLockAt100} />
              </div>
            </div>
          </div>

          <div className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full h-14 sm:h-16 rounded-[20px] sm:rounded-[24px] bg-[#4a6850] hover:bg-[#3d5643] text-white font-black text-lg sm:text-xl shadow-xl shadow-[#4a6850]/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 border-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="w-full h-12 sm:h-14 text-gray-400 hover:text-gray-600 font-bold rounded-xl sm:rounded-2xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PersonalBudgetSheet;
