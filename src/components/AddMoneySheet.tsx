import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, PiggyBank } from "lucide-react";
import Tooltip from "./Tooltip";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";

interface AddMoneySheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number, note?: string) => Promise<void>;
}

const AddMoneySheet = ({ open, onClose, onSubmit }: AddMoneySheetProps) => {
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setAmount("");
    setNote("");
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    const amountValue = parseFloat(amount);

    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error(t('sheets.add_money.error_valid_amount'));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(amountValue, note.trim() || undefined);
      handleClose();
    } catch (error) {
      console.error("Add money error:", error);
      setIsSubmitting(false);
    }
  };

  const canSubmit = () => {
    const amountValue = parseFloat(amount);
    return amountValue > 0 && !isNaN(amountValue);
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 shadow-[0_-20px_60px_rgba(74,104,80,0.1)] z-[100]">

        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 z-[150] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
            <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-black text-slate-900">{t('sheets.add_expense.processing')}</h3>
          </div>
        )}

        <SheetHeader className="flex-shrink-0 mb-6 pt-2">
          {/* Handle Bar */}
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>

          <div className="flex items-center justify-center gap-3">
            <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-3">
              <PiggyBank className="w-7 h-7 text-[#4a6850]" />
              {t('sheets.add_money.title')}
            </SheetTitle>
            <Tooltip
              content={t('sheets.add_money.tooltip')}
              position="bottom"
            />
          </div>
          <SheetDescription className="text-sm text-[#4a6850]/80 text-center font-bold">
            {t('sheets.add_money.subtitle')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Amount Input - iPhone Style */}
          <div className="text-center py-8">
            <div className="text-4xl font-black text-gray-900 mb-6 tracking-tighter tabular-nums">
              {formatAmount(parseFloat(amount) || 0)}
            </div>
            <Input
              type="number"
              placeholder={t('sheets.add_money.amount_placeholder')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-center text-xl h-14 max-w-sm mx-auto rounded-3xl border-[#4a6850]/20 shadow-lg font-black text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl"
              autoFocus
            />
          </div>

          {/* Quick Amount Buttons - iPhone Style */}
          <div className="mb-8">
            <label className="text-sm font-black text-[#4a6850]/80 mb-4 block uppercase tracking-wide">
              {t('sheets.add_money.quick_amounts_label')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  className="p-4 rounded-3xl bg-white hover:bg-[#4a6850]/5 transition-all text-center border border-[#4a6850]/10 shadow-lg hover:shadow-xl hover:border-[#4a6850]/20"
                >
                  <div className="font-black text-gray-900 tracking-tight">{formatAmount(quickAmount)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Note - iPhone Style */}
          <div className="mb-8">
            <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">
              {t('sheets.add_money.note_label')}
            </label>
            <Input
              placeholder={t('sheets.add_money.note_placeholder')}
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
                <h4 className="font-black text-gray-900 mb-2 tracking-tight">{t('sheets.add_money.info_title')}</h4>
                <p className="text-sm text-[#4a6850]/80 font-bold leading-relaxed">
                  {t('sheets.add_money.info_text')}
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
                    +{formatAmount(parseFloat(amount) || 0)}
                  </div>
                  <div className="text-sm text-white/90 font-bold">
                    {t('sheets.add_money.summary_title')}
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
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit()}
              className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
            >
              {t('sheets.add_money.submit_btn')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddMoneySheet;