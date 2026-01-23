import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Search,
  Calendar,
  Activity as ActivityIcon
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import AppContainer from "@/components/AppContainer";
import PageGuide from "@/components/PageGuide";
import { Input } from "@/components/ui/input";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const Activity = () => {
  const navigate = useNavigate();
  const { getAllTransactions, groups } = useFirebaseData();
  const { user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);

  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("activity");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "expense" | "payment" | "wallet">("all");
  const [filterDate, setFilterDate] = useState<"all" | "today" | "week" | "month">("all");
  const [showActivityGuide, setShowActivityGuide] = useState(false);

  // Check if we should show page guide
  useEffect(() => {
    if (shouldShowPageGuide('activity')) {
      setShowActivityGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleActivityGuideClose = () => {
    setShowActivityGuide(false);
    markPageGuideShown('activity');
  };

  const allTransactions = getAllTransactions();

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;

    // Filter by type
    if (filterType !== "all") {
      if (filterType === "wallet") {
        filtered = filtered.filter(t => t.type === "wallet_add" || t.type === "wallet_deduct");
      } else {
        filtered = filtered.filter(t => t.type === filterType);
      }
    }

    // Filter by date
    if (filterDate !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.createdAt);

        if (filterDate === "today") {
          return transactionDate >= today;
        } else if (filterDate === "week") {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return transactionDate >= weekAgo;
        } else if (filterDate === "month") {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return transactionDate >= monthAgo;
        }
        return true;
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.place?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [allTransactions, filterType, filterDate, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === "expense");
    const payments = filteredTransactions.filter(t => t.type === "payment");
    const walletAdds = filteredTransactions.filter(t => t.type === "wallet_add");

    const totalSpent = expenses.reduce((sum, t) => {
      if (t.paidBy === user?.uid) return sum + t.amount;
      const userPart = t.participants?.find((p: any) => p.id === user?.uid);
      return sum + (userPart ? userPart.amount : 0);
    }, 0);
    const totalReceived = payments.reduce((sum, t) => {
      if (t.to === user?.uid) return sum + t.amount;
      return sum;
    }, 0);
    const totalAdded = walletAdds.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalTransactions: filteredTransactions.length,
      totalSpent,
      totalReceived,
      totalAdded,
      expenseCount: expenses.length,
      paymentCount: payments.length,
    };
  }, [filteredTransactions]);

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === "home") {
      navigate("/");
    } else if (tab === "groups") {
      navigate("/groups");
    } else if (tab === "profile") {
      navigate("/profile");
    } else if (tab === "activity") {
      navigate("/activity");
    } else {
      setActiveTab(tab);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "expense":
        return <ArrowUpRight className="w-5 h-5" />;
      case "payment":
        return <ArrowDownLeft className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "expense":
        return "bg-red-50 border-red-100 text-red-500";
      case "payment":
        return "bg-emerald-50 border-emerald-100 text-emerald-500";
      default:
        return "bg-blue-50 border-blue-100 text-blue-500";
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar />

      <AppContainer className="bg-white pb-24">
        {/* Desktop Header */}
        <DesktopHeader />

        {/* iPhone-style top accent border - Mobile only */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>

        {/* App Header - iPhone Style Enhanced with #4a6850 */}
        <div className="bg-white border-b border-[#4a6850]/10 pt-2 pb-3 px-4 sticky top-0 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
          <div className="flex items-center justify-between">
            {/* App Logo and Name - Enhanced */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-2xl flex items-center justify-center shadow-lg">
                <img
                  src="/only-logo.png"
                  alt="Hostel Ledger"
                  className="w-6 h-6 object-contain filter brightness-0 invert"
                />
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Hostel Ledger</h1>
            </div>

            {/* Header Actions - Enhanced */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl flex items-center justify-center shadow-lg">
                <ActivityIcon className="w-7 h-7 text-white font-bold" />
              </div>
            </div>
          </div>
        </div>

        {/* Header - iPhone Style Enhanced */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center gap-4 mb-6 lg:mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">Activity Center</h1>
              <p className="text-xs lg:text-sm text-[#4a6850]/80 font-bold">Track all your transactions</p>
            </div>
          </div>

          {/* Statistics Cards - iPhone Style Enhanced */}
          <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-6 lg:mb-8">
            <div className="bg-white rounded-3xl p-4 lg:p-5 border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
              <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-1.5 lg:mb-2 font-black uppercase tracking-widest">Total Transactions</div>
              <div className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">{stats.totalTransactions}</div>
            </div>

            <div className="bg-white rounded-3xl p-4 lg:p-5 border border-red-500/10 shadow-[0_20px_60px_rgba(239,68,68,0.08)]">
              <div className="text-[10px] lg:text-xs text-red-500/70 mb-1.5 lg:mb-2 font-black uppercase tracking-widest">Total Spent</div>
              <div className="text-2xl lg:text-3xl font-black text-red-600 tracking-tight tabular-nums">Rs {stats.totalSpent.toLocaleString()}</div>
            </div>

            <div className="bg-white rounded-3xl p-4 lg:p-5 border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
              <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-1.5 lg:mb-2 font-black uppercase tracking-widest">Total Received</div>
              <div className="text-2xl lg:text-3xl font-black text-[#4a6850] tracking-tight tabular-nums">Rs {stats.totalReceived.toLocaleString()}</div>
            </div>

            <div className="bg-white rounded-3xl p-4 lg:p-5 border border-blue-500/10 shadow-[0_20px_60px_rgba(59,130,246,0.08)]">
              <div className="text-[10px] lg:text-xs text-blue-500/70 mb-1.5 lg:mb-2 font-black uppercase tracking-widest">Money Added</div>
              <div className="text-2xl lg:text-3xl font-black text-blue-600 tracking-tight tabular-nums">Rs {stats.totalAdded.toLocaleString()}</div>
            </div>
          </div>

          {/* Search - iPhone Style Enhanced */}
          <div className="relative mb-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 h-14 bg-white rounded-3xl border-[#4a6850]/10 shadow-[0_8px_32px_rgba(74,104,80,0.06)] font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850]/30 focus:shadow-[0_12px_40px_rgba(74,104,80,0.1)]"
            />
          </div>

          {/* Filters - iPhone Style Enhanced */}
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide mb-4">
            {/* Type Filter */}
            <button
              onClick={() => setFilterType("all")}
              className={`px-5 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all shadow-lg ${filterType === "all"
                  ? "bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white scale-105"
                  : "bg-white text-[#4a6850]/80 hover:bg-[#4a6850]/5 border border-[#4a6850]/10"
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("expense")}
              className={`px-5 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all shadow-lg ${filterType === "expense"
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white scale-105"
                  : "bg-white text-red-600/80 hover:bg-red-50 border border-red-500/10"
                }`}
            >
              Expenses ({stats.expenseCount})
            </button>
            <button
              onClick={() => setFilterType("payment")}
              className={`px-5 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all shadow-lg ${filterType === "payment"
                  ? "bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white scale-105"
                  : "bg-white text-[#4a6850]/80 hover:bg-[#4a6850]/5 border border-[#4a6850]/10"
                }`}
            >
              Payments ({stats.paymentCount})
            </button>
            <button
              onClick={() => setFilterType("wallet")}
              className={`px-5 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all shadow-lg ${filterType === "wallet"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white scale-105"
                  : "bg-white text-blue-600/80 hover:bg-blue-50 border border-blue-500/10"
                }`}
            >
              Wallet
            </button>
          </div>

          {/* Date Filter - iPhone Style Enhanced */}
          <div className="flex gap-3 mt-3 overflow-x-auto pb-3 scrollbar-hide">
            <Calendar className="w-5 h-5 text-[#4a6850]/60 flex-shrink-0 mt-3" />
            <button
              onClick={() => setFilterDate("all")}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${filterDate === "all"
                  ? "bg-gray-800 text-white shadow-lg scale-105"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              All Time
            </button>
            <button
              onClick={() => setFilterDate("today")}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${filterDate === "today"
                  ? "bg-gray-800 text-white shadow-lg scale-105"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilterDate("week")}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${filterDate === "week"
                  ? "bg-gray-800 text-white shadow-lg scale-105"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              This Week
            </button>
            <button
              onClick={() => setFilterDate("month")}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${filterDate === "month"
                  ? "bg-gray-800 text-white shadow-lg scale-105"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              This Month
            </button>
          </div>
        </div>

        {/* Transactions List - iPhone Style Enhanced */}
        <div className="px-6">
          {filteredTransactions.length > 0 ? (
            <div className="space-y-4">
              {filteredTransactions.map((transaction, index) => {
                const transactionGroup = groups.find(g => g.id === transaction.groupId);
                const isPayer = transaction.paidBy === user?.uid;
                const userParticipant = transaction.participants?.find((p: any) => p.id === user?.uid);
                const isParticipant = !!userParticipant;

                const displayAmount = transaction.type === 'expense'
                  ? (isPayer ? transaction.amount : isParticipant ? userParticipant.amount : 0)
                  : transaction.amount;

                return (
                  <div
                    key={transaction.id}
                    className="w-full bg-white rounded-3xl p-5 border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)] hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all animate-slide-up group"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 lg:w-12 h-11 lg:h-12 rounded-2xl flex items-center justify-center border shadow-lg group-hover:scale-105 transition-transform ${getTransactionColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-black text-gray-900 text-base lg:text-lg tracking-tight mb-0.5 lg:mb-1 truncate">{transaction.title}</div>
                        <div className="text-xs lg:text-sm text-[#4a6850]/80 font-bold truncate">
                          {transactionGroup && (
                            <span className="text-[#4a6850] font-black">{transactionGroup.name} • </span>
                          )}
                          <span>{transaction.date}</span>
                          {transaction.place && (
                            <span className="text-[#4a6850]/60"> • {transaction.place}</span>
                          )}
                        </div>
                        {transaction.note && (
                          <div className="text-[10px] lg:text-xs text-gray-500 mt-0.5 lg:mt-1 font-medium truncate">{transaction.note}</div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className={`font-black text-base lg:text-xl tabular-nums tracking-tight ${transaction.type === "expense"
                            ? (isPayer || isParticipant ? "text-red-600" : "text-slate-400")
                            : transaction.type === "payment" ? "text-[#4a6850]" : "text-blue-600"
                          }`}>
                          {transaction.type === "expense" && !isPayer && !isParticipant ? "" : (transaction.type === "expense" ? "-" : "+")}
                          {transaction.type === "expense" && !isPayer && !isParticipant ? "-" : `Rs ${displayAmount.toLocaleString()}`}
                        </div>
                        {transaction.method && (
                          <div className="text-[10px] lg:text-xs text-gray-500 mt-0.5 lg:mt-1 font-bold capitalize">{transaction.method}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
              <div className="w-16 lg:w-20 h-16 lg:h-20 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-3xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
                <ActivityIcon className="w-8 lg:w-10 h-8 lg:h-10 text-[#4a6850] font-bold" />
              </div>
              <h3 className="text-lg lg:text-xl font-black text-gray-900 mb-2 lg:mb-3 tracking-tight">No transactions found</h3>
              <p className="text-[#4a6850]/80 font-bold max-w-sm mx-auto text-sm lg:text-base px-4">
                {searchQuery || filterType !== "all" || filterDate !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Start by adding an expense or recording a payment"}
              </p>
            </div>
          )}
        </div>

        {/* Activity Page Guide */}
        <PageGuide
          title="Activity History"
          description="See all your transactions, payments, and expense history in one place. Track your financial activity across all groups."
          tips={[
            "Use filters to find specific transactions quickly",
            "Search by description, amount, or group name",
            "Tap any transaction to see detailed information"
          ]}
          emoji="📊"
          show={showActivityGuide}
          onClose={handleActivityGuideClose}
        />

        {/* Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </AppContainer>
    </>
  );
};

export default Activity;
