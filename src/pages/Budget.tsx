import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Wallet, TrendingDown, TrendingUp, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";

interface BudgetEntry {
  id: string;
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

const BUDGET_KEY = "hostel_wallet_budget";

const Budget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { groups, transactions } = useFirebaseData();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const { formatAmount } = useCurrency();

  const [showAddFunds, setShowAddFunds] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [fundNote, setFundNote] = useState("");
  const [showPageGuide, setShowPageGuide] = useState(false);
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>(() => {
    if (user) {
      const saved = localStorage.getItem(`${BUDGET_KEY}_${user.uid}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    if (shouldShowPageGuide('budget')) {
      setShowPageGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleClosePageGuide = () => {
    setShowPageGuide(false);
    markPageGuideShown('budget');
  };

  // Calculate total funds added
  const totalFunds = useMemo(() => {
    return budgetEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [budgetEntries]);

  // Calculate total spent (expenses where you paid)
  const totalSpent = useMemo(() => {
    let spent = 0;
    transactions.forEach((t) => {
      if (t.type === "expense" && t.paidBy === user?.uid) {
        spent += t.amount;
      }
    });
    return spent;
  }, [transactions, user?.uid]);

  // Calculate balance stats from groups
  const { toReceive, toOwe } = useMemo(() => {
    let receive = 0;
    let owe = 0;

    groups.forEach((group) => {
      const currentUserMember = group.members.find((m) => m.isCurrentUser);
      if (currentUserMember) {
        if (currentUserMember.balance > 0) {
          receive += currentUserMember.balance;
        } else {
          owe += Math.abs(currentUserMember.balance);
        }
      }
    });

    return { toReceive: receive, toOwe: owe };
  }, [groups]);

  // Remaining budget
  const remainingBudget = totalFunds - totalSpent + toReceive - toOwe;

  const handleAddFunds = () => {
    if (!fundAmount || parseFloat(fundAmount) <= 0) return;

    const newEntry: BudgetEntry = {
      id: crypto.randomUUID(),
      amount: parseFloat(fundAmount),
      note: fundNote || t('budget.added_to_budget'),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      createdAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...budgetEntries];
    setBudgetEntries(updated);
    if (user) {
      localStorage.setItem(`${BUDGET_KEY}_${user.uid}`, JSON.stringify(updated));
    }

    setFundAmount("");
    setFundNote("");
    setShowAddFunds(false);
  };

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>

      <PageGuide
        title={t('budget.guide.title')}
        description={t('budget.guide.description')}
        tips={[
          t('budget.guide.tip1'),
          t('budget.guide.tip2'),
          t('budget.guide.tip3')
        ]}
        emoji="📊"
        show={showPageGuide}
        onClose={handleClosePageGuide}
      />

      <header className="px-4 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t('budget.title')}</h1>
        </div>

        <div className="bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl p-7 shadow-[0_25px_70px_rgba(74,104,80,0.4)] text-white border-t-2 border-[#5a7860]/40">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-6 h-6 text-white/90 font-bold" />
            <span className="text-sm text-white/90 font-black tracking-wide uppercase">{t('budget.remaining')}</span>
          </div>
          <div className="text-5xl font-black mb-4 tracking-tighter tabular-nums drop-shadow-sm">
            {formatAmount(remainingBudget)}
          </div>

          <Button
            onClick={() => setShowAddFunds(true)}
            variant="secondary"
            className="w-full h-12 bg-white/20 hover:bg-white/30 text-white border-white/30 font-black rounded-2xl"
          >
            <Plus className="w-4 h-4 mr-2 font-bold" />
            {t('budget.add_funds')}
          </Button>
        </div>
      </header>

      <main className="px-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#4a6850]/20 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[#4a6850] font-bold" />
              </div>
              <span className="text-xs text-[#4a6850]/70 font-black uppercase tracking-wide">{t('budget.total_added')}</span>
            </div>
            <div className="text-2xl font-black text-gray-900 tracking-tight tabular-nums">
              {formatAmount(totalFunds)}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(239,68,68,0.08)] border border-red-500/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500 font-bold" />
              </div>
              <span className="text-xs text-red-500/70 font-black uppercase tracking-wide">{t('budget.total_spent')}</span>
            </div>
            <div className="text-2xl font-black text-red-600 tracking-tight tabular-nums">
              {formatAmount(totalSpent)}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#4a6850]/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#4a6850] font-bold" />
              </div>
              <span className="text-xs text-[#4a6850]/70 font-black uppercase tracking-wide">{t('budget.to_receive')}</span>
            </div>
            <div className="text-2xl font-black text-[#4a6850] tracking-tight tabular-nums">
              {formatAmount(toReceive)}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(239,68,68,0.08)] border border-red-500/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500 font-bold" />
              </div>
              <span className="text-xs text-red-500/70 font-black uppercase tracking-wide">{t('budget.to_owe')}</span>
            </div>
            <div className="text-2xl font-black text-red-600 tracking-tight tabular-nums">
              {formatAmount(toOwe)}
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-sm font-black text-[#4a6850]/80 uppercase tracking-widest mb-4">{t('budget.history_title')}</h2>

          {budgetEntries.length > 0 ? (
            <div className="space-y-3">
              {budgetEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 flex items-center justify-between"
                >
                  <div>
                    <div className="font-black text-gray-900 tracking-tight">{entry.note}</div>
                    <div className="text-sm text-[#4a6850]/80 font-bold">{entry.date}</div>
                  </div>
                  <div className="text-2xl font-black text-[#4a6850] tabular-nums tracking-tight">
                    +{formatAmount(entry.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
              <div className="w-16 h-16 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <PiggyBank className="w-8 h-8 text-[#4a6850] font-bold" />
              </div>
              <h3 className="font-black text-gray-900 mb-2 tracking-tight">{t('budget.no_funds')}</h3>
              <p className="text-sm text-[#4a6850]/80 mb-4 font-bold">
                {t('budget.no_funds_desc')}
              </p>
              <Button onClick={() => setShowAddFunds(true)} variant="outline" className="border-[#4a6850]/30 text-[#4a6850] hover:bg-[#4a6850]/5 font-black rounded-2xl">
                <Plus className="w-4 h-4 mr-2 font-bold" />
                {t('budget.add_funds')}
              </Button>
            </div>
          )}
        </section>
      </main>

      <Sheet open={showAddFunds} onOpenChange={setShowAddFunds}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle>{t('budget.add_funds')}</SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              {t('budget.budget_description')}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {t('budget.amount_label')}
              </label>
              <Input
                type="number"
                placeholder={t('budget.amount_placeholder')}
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="h-12 text-lg"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {t('budget.note_optional')}
              </label>
              <Input
                placeholder={t('budget.note_placeholder')}
                value={fundNote}
                onChange={(e) => setFundNote(e.target.value)}
                className="h-12"
              />
            </div>

            <Button
              onClick={handleAddFunds}
              disabled={!fundAmount || parseFloat(fundAmount) <= 0}
              className="w-full h-12"
            >
              {t('budget.add_funds')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Budget;
