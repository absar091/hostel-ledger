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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 pb-8">
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
          <h1 className="text-2xl font-bold text-gray-900">My Budget</h1>
        </div>

        {/* Budget Overview Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank className="w-5 h-5 text-white/80" />
            <span className="text-sm text-white/80">Remaining Budget</span>
          </div>
          <div className="text-4xl font-bold mb-4">
            {remainingBudget >= 0 ? "" : "-"}Rs {Math.abs(remainingBudget).toLocaleString()}
          </div>
          
          <Button
            onClick={() => setShowAddFunds(true)}
            variant="secondary"
            className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Funds
          </Button>
        </div>
      </header>

      {/* Stats Grid */}
      <main className="px-4 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm text-gray-500">Total Added</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              Rs {totalFunds.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-sm text-gray-500">Total Spent</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              Rs {totalSpent.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-sm text-gray-500">To Receive</span>
            </div>
            <div className="text-xl font-bold text-emerald-600">
              Rs {toReceive.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-sm text-gray-500">You Owe</span>
            </div>
            <div className="text-xl font-bold text-red-500">
              Rs {toOwe.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Funds History */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Funds Added</h2>
          
          {budgetEntries.length > 0 ? (
            <div className="space-y-3">
              {budgetEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900">{entry.note}</div>
                    <div className="text-sm text-gray-500">{entry.date}</div>
                  </div>
                  <div className="text-lg font-bold text-emerald-600">
                    +Rs {entry.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <PiggyBank className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">No funds added yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Add your monthly allowance to track spending
              </p>
              <Button onClick={() => setShowAddFunds(true)} variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                <Plus className="w-4 h-4 mr-2" />
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
