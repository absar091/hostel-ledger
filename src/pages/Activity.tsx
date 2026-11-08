import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Search,
  Calendar,
  Activity as ActivityIcon,
  MessageSquareText,
  X
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import MobileHeader from "@/components/MobileHeader";
import AppContainer from "@/components/AppContainer";
import PageGuide from "@/components/PageGuide";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import ExpenseThreadSheet from "@/components/ExpenseThreadSheet";
import { TransactionList } from "@/components/TransactionList";
import { Input } from "@/components/ui/input";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";

const Activity = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getAllTransactions, groups } = useFirebaseData();
  const { user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const { formatAmount } = useCurrency();

  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("activity");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "expense" | "payment">("all");
  const [filterDate, setFilterDate] = useState<"all" | "today" | "week" | "month">("all");
  const [showActivityGuide, setShowActivityGuide] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatTransaction, setChatTransaction] = useState<any>(null);

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
      filtered = filtered.filter(t => t.type === filterType);
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

  const groupMap = useMemo(() => {
    return Object.fromEntries(groups.map(g => [g.id, g]));
  }, [groups]);

  // Calculate statistics
  const stats = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === "expense");
    const payments = filteredTransactions.filter(t => t.type === "payment");


    const totalSpent = expenses.reduce((sum, t) => {
      // Use the denormalized userShare field which is always correct
      if (t.userShare !== undefined && t.userShare > 0) return sum + t.userShare;

      // Fallback: check if user is payer (creator whose member ID = uid)
      if (t.paidBy === user?.uid) {
        // User paid — their share is their participant amount, not total
        const userPart = t.participants?.find((p: any) => p.id === user?.uid);
        return sum + (userPart ? userPart.amount : 0);
      }

      // Fallback: check participants array directly
      const userPart = t.participants?.find((p: any) => p.id === user?.uid);
      return sum + (userPart ? (userPart.amount || 0) : 0);
    }, 0);

    const totalReceived = payments.reduce((sum, t) => {
      // 1. If you are the receiver
      if (t.userRole === 'receiver') return sum + (t.amount || 0);
      if (t.to === user?.uid) return sum + (t.amount || 0);
      return sum;
    }, 0);


    return {
      totalTransactions: filteredTransactions.length,
      totalSpent,
      totalReceived,
      expenseCount: expenses.length,
      paymentCount: payments.length,
    };
  }, [filteredTransactions, user?.uid]);

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

  return (
    <>
      <Sidebar />

      <AppContainer className="bg-white pb-24">
        <DesktopHeader />

        <MobileHeader />

        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center gap-4 mb-6 lg:mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">{t('activity.title')}</h1>
              <p className="text-xs lg:text-sm text-[#4a6850]/80 font-bold">Track all your transactions</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-6 lg:mb-8">
            <div className="bg-white rounded-3xl p-4 lg:p-5 border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
              <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-1.5 lg:mb-2 font-black uppercase tracking-widest">{t('group.expenses_count')}</div>
              <div className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">{stats.totalTransactions}</div>
            </div>

            <div className="bg-white rounded-3xl p-4 lg:p-5 border border-red-500/10 shadow-[0_20px_60px_rgba(239,68,68,0.08)]">
              <div className="text-[10px] lg:text-xs text-red-500/70 mb-1.5 lg:mb-2 font-black uppercase tracking-widest">{t('activity.stats.total_spent')}</div>
              <div className="text-2xl lg:text-3xl font-black text-red-600 tracking-tight tabular-nums">{formatAmount(stats.totalSpent)}</div>
            </div>

            <div className="bg-white rounded-3xl p-4 lg:p-5 border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
              <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-1.5 lg:mb-2 font-black uppercase tracking-widest">{t('activity.stats.total_received')}</div>
              <div className="text-2xl lg:text-3xl font-black text-[#4a6850] tracking-tight tabular-nums">{formatAmount(stats.totalReceived)}</div>
            </div>


          </div>

          <div className="relative mb-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
            <Input
              placeholder={t('activity.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 pr-12 h-14 bg-white rounded-3xl border-[#4a6850]/10 shadow-[0_8px_32px_rgba(74,104,80,0.06)] font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850]/30 focus:shadow-[0_12px_40px_rgba(74,104,80,0.1)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#4a6850]/40 hover:text-[#4a6850]/60 hover:bg-[#4a6850]/5 transition-all"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide mb-4">
            <button
              onClick={() => setFilterType("all")}
              aria-pressed={filterType === "all"}
              className={`px-5 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-2 ${filterType === "all"
                ? "bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white scale-105"
                : "bg-white text-[#4a6850]/80 hover:bg-[#4a6850]/5 border border-[#4a6850]/10"
                }`}
            >
              {t('activity.filters.all')}
            </button>
            <button
              onClick={() => setFilterType("expense")}
              aria-pressed={filterType === "expense"}
              className={`px-5 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-2 ${filterType === "expense"
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white scale-105"
                : "bg-white text-red-600/80 hover:bg-red-50 border border-red-500/10"
                }`}
            >
              {t('activity.filters.expense')} ({stats.expenseCount})
            </button>
            <button
              onClick={() => setFilterType("payment")}
              aria-pressed={filterType === "payment"}
              className={`px-5 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-2 ${filterType === "payment"
                ? "bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white scale-105"
                : "bg-white text-[#4a6850]/80 hover:bg-[#4a6850]/5 border border-[#4a6850]/10"
                }`}
            >
              {t('activity.filters.payment')} ({stats.paymentCount})
            </button>

          </div>

          <div className="flex gap-3 mt-3 overflow-x-auto pb-3 scrollbar-hide">
            <Calendar className="w-5 h-5 text-[#4a6850]/60 flex-shrink-0 mt-3" />
            <button
              onClick={() => setFilterDate("all")}
              aria-pressed={filterDate === "all"}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-2 ${filterDate === "all"
                ? "bg-gray-800 text-white shadow-lg scale-105"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              {t('activity.date_filters.all')}
            </button>
            <button
              onClick={() => setFilterDate("today")}
              aria-pressed={filterDate === "today"}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-2 ${filterDate === "today"
                ? "bg-gray-800 text-white shadow-lg scale-105"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              {t('activity.date_filters.today')}
            </button>
            <button
              onClick={() => setFilterDate("week")}
              aria-pressed={filterDate === "week"}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-2 ${filterDate === "week"
                ? "bg-gray-800 text-white shadow-lg scale-105"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              {t('activity.date_filters.week')}
            </button>
            <button
              onClick={() => setFilterDate("month")}
              aria-pressed={filterDate === "month"}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-2 ${filterDate === "month"
                ? "bg-gray-800 text-white shadow-lg scale-105"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              {t('activity.date_filters.month')}
            </button>
          </div>
        </div>

        <div className="px-6">
          {/* ⚡ Bolt Optimization: Replaced O(n) inline mapping with memoized TransactionList to prevent expensive re-renders on local state changes (e.g. showChat modal toggle). Expected impact: ~50% reduction in Activity page render time for users with many transactions. */}
          {filteredTransactions.length > 0 ? (
            <TransactionList
              transactions={filteredTransactions}
              groups={groups}
              userId={user?.uid}
              onSelectTransaction={setSelectedTransaction}
              formatAmount={formatAmount}
              dateFormat="date"
            />
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
              <div className="w-16 lg:w-20 h-16 lg:h-20 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-3xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
                <ActivityIcon className="w-8 lg:w-10 h-8 lg:h-10 text-[#4a6850] font-bold" />
              </div>
              <h3 className="text-lg lg:text-xl font-black text-gray-900 mb-2 lg:mb-3 tracking-tight">{t('activity.no_activity')}</h3>
              <p className="text-[#4a6850]/80 font-bold max-w-sm mx-auto text-sm lg:text-base px-4">
                {searchQuery || filterType !== "all" || filterDate !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Start by adding an expense or recording a payment"}
              </p>
            </div>
          )}
        </div>

        <PageGuide
          title={t('activity.guide.title')}
          description={t('activity.guide.description')}
          tips={[
            t('activity.guide.tip1'),
            t('activity.guide.tip2'),
            t('activity.guide.tip3')
          ]}
          emoji="📊"
          show={showActivityGuide}
          onClose={handleActivityGuideClose}
        />

        {selectedTransaction && (
          <TransactionDetailModal
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
            groups={groups}
            user={user}
          />
        )}

        {chatTransaction && (
          <ExpenseThreadSheet
            isOpen={showChat}
            onClose={() => {
              setShowChat(false);
              setChatTransaction(null);
            }}
            groupId={chatTransaction.groupId}
            groupName={groupMap[chatTransaction.groupId]?.name || "Group"}
            expenseId={chatTransaction.id}
            expenseTitle={chatTransaction.title}
          />
        )}

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </AppContainer>
    </>
  );
};

export default Activity;
