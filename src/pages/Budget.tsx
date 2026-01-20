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

interface BudgetEntry {
  id: string;
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

const BUDGET_KEY = "hostel_wallet_budget";

const Budget = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { groups, transactions } = useFirebaseData();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  
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
      if (t.type === "expense" && t.paidByName === "You") {
        spent += t.amount;
      }
    });
    return spent;
  }, [transactions]);

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
      note: fundNote || "Added funds",
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
      {/* iPhone-style top accent border */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>
      
      {/* Page Guide */}
      <PageGuide
        title="Budget Tracker 💰"
        description="Keep track of your monthly allowance and spending to stay within budget."
        tips={[
          "Add your monthly allowance or pocket money using 'Add Funds'",
          "Your remaining budget considers money you've spent and what others owe you",
          "Green numbers mean money coming to you, red means money you owe"
        ]}
        emoji="📊"
        show={showPageGuide}
        onClose={handleClosePageGuide}
      />

      {/* Header */}
      <header className="px-4 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Budget</h1>
        </div>

        {/* Budget Overview Card */}
        <div className="bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl p-7 shadow-[0_25px_70px_rgba(74,104,80,0.4)] text-white border-t-2 border-[#5a7860]/40">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-6 h-6 text-white/90 font-bold" />
            <span className="text-sm text-white/90 font-black tracking-wide uppercase">Remaining Budget</span>
          </div>
          <div className="text-5xl font-black mb-4 tracking-tighter tabular-nums drop-shadow-sm">
            {remainingBudget >= 0 ? "" : "-"}Rs {Math.abs(remainingBudget).toLocaleString()}
          </div>
          
          <Button
            onClick={() => setShowAddFunds(true)}
            variant="secondary"
            className="w-full h-12 bg-white/20 hover:bg-white/30 text-white border-white/30 font-black rounded-2xl"
          >
            <Plus className="w-4 h-4 mr-2 font-bold" />
            Add Funds
          </Button>
        </div>
      </header>

      {/* Stats Grid */}
      <main className="px-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#4a6850]/20 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[#4a6850] font-bold" />
              </div>
              <span className="text-xs text-[#4a6850]/70 font-black uppercase tracking-wide">Total Added</span>
            </div>
            <div className="text-2xl font-black text-gray-900 tracking-tight tabular-nums">
              Rs {totalFunds.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(239,68,68,0.08)] border border-red-500/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500 font-bold" />
              </div>
              <span className="text-xs text-red-500/70 font-black uppercase tracking-wide">Total Spent</span>
            </div>
            <div className="text-2xl font-black text-red-600 tracking-tight tabular-nums">
              Rs {totalSpent.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#4a6850]/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#4a6850] font-bold" />
              </div>
              <span className="text-xs text-[#4a6850]/70 font-black uppercase tracking-wide">To Receive</span>
            </div>
            <div className="text-2xl font-black text-[#4a6850] tracking-tight tabular-nums">
              Rs {toReceive.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(239,68,68,0.08)] border border-red-500/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500 font-bold" />
              </div>
              <span className="text-xs text-red-500/70 font-black uppercase tracking-wide">You Owe</span>
            </div>
            <div className="text-2xl font-black text-red-600 tracking-tight tabular-nums">
              Rs {toOwe.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Funds History */}
        <section>
          <h2 className="text-sm font-black text-[#4a6850]/80 uppercase tracking-widest mb-4">Funds Added</h2>
          
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
                    +Rs {entry.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
              <div className="w-16 h-16 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <PiggyBank className="w-8 h-8 text-[#4a6850] font-bold" />
              </div>
              <h3 className="font-black text-gray-900 mb-2 tracking-tight">No funds added yet</h3>
              <p className="text-sm text-[#4a6850]/80 mb-4 font-bold">
                Add your monthly allowance to track spending
              </p>
              <Button onClick={() => setShowAddFunds(true)} variant="outline" className="border-[#4a6850]/30 text-[#4a6850] hover:bg-[#4a6850]/5 font-black rounded-2xl">
                <Plus className="w-4 h-4 mr-2 font-bold" />
                Add Funds
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Add Funds Sheet */}
      <Sheet open={showAddFunds} onOpenChange={setShowAddFunds}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle>Add Funds</SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              Add money to your budget tracking
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Amount
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="h-12 text-lg"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Note (optional)
              </label>
              <Input
                placeholder="e.g., Monthly allowance from family"
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
              Add Funds
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Budget;
