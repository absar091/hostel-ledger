import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Split,
  UserPlus,
  Send,
  PlusCircle,
  Users,
  Home,
  Clock,
  User as UserIcon
} from "lucide-react";
import { toast } from "sonner";
import MobileHeader from "@/components/MobileHeader";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import NotificationPrompt from "@/components/NotificationPrompt";
import AIInsightsSheet from "@/components/AIInsightsSheet";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useSync } from "@/hooks/useSync";
import { useOneSignalPush } from "@/hooks/useOneSignalPush";
import { usePendingGroupJoin } from "@/hooks/usePendingGroupJoin";
import { useTranslation } from "react-i18next";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const {
    user,
    getWalletBalance,
    getTotalToReceive,
    getTotalToPay,
    getSettlementDelta,
  } = useFirebaseAuth();
  const {
    groups,
    createGroup,
    addExpense,
    recordPayment,
    allTransactions = [],
  } = useFirebaseData();
  const { isInstalled } = usePWAInstall();
  const { isOnline, pendingCount, isSyncing, syncData: syncNow } = useSync();
  const offline = !isOnline;
  const {
    isSupported: notificationsSupported,
    permission: notificationPermission,
    subscribe: subscribeToPush,
  } = useOneSignalPush();
  const {
    shouldShowOnboarding,
    shouldShowPageGuide,
    markOnboardingComplete,
    markPageGuideShown,
  } = useUserPreferences(user?.uid);

  // Check for pending group join from email invite
  usePendingGroupJoin(user?.uid);

  const [activeTab, setActiveTab] = useState<
    "home" | "groups" | "add" | "activity" | "profile"
  >("home");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [initialGroupIdForSheet, setInitialGroupIdForSheet] = useState("");

  // Notification prompt state
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);

  // Derived Values
  const walletBalance = getWalletBalance();
  const totalToReceive = getTotalToReceive();
  const totalToPay = getTotalToPay();
  const settlementDelta = getSettlementDelta();

  const lastTransactionTime = useMemo(() => {
    if (!allTransactions || allTransactions.length === 0) return "No transactions yet";
    const lastTx = allTransactions[0];
    const txTime = new Date(lastTx.timestamp || lastTx.date);
    const now = new Date();
    const diffMs = now.getTime() - txTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `Updated ${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    }
    if (diffHours < 24) return `Updated ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Updated ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }, [allTransactions]);

  // Persist day-to-day settlement delta
  useEffect(() => {
    if (user?.uid) {
      const today = new Date().toISOString().split("T")[0];
      const todayKey = `settlementDelta_${user.uid}_${today}`;
      localStorage.setItem(todayKey, settlementDelta.toString());
    }
  }, [user?.uid, settlementDelta]);

  const afterSettlementsBalance = walletBalance + settlementDelta;

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === "add") {
      setShowAddExpense(true);
      return;
    }
    setActiveTab(tab);
    if (tab === "groups") navigate("/groups");
    if (tab === "activity") navigate("/activity");
    if (tab === "profile") navigate("/profile");
  };

  const handleCreateExpense = async (data: any) => {
    if (!user) return;
    try {
      await addExpense({
        ...data,
        groupId: data.groupId || "personal",
        paidBy: data.paidBy || user.uid,
      });
      toast.success(t('expense.add_success'));
      setShowAddExpense(false);
    } catch (error) {
      console.error("Failed to add expense", error);
      toast.error(t('expense.add_error'));
    }
  };

  const recentActivity = useMemo(() => {
    return (allTransactions || []).slice(0, 3);
  }, [allTransactions]);

  const firstName = user?.name?.split(' ')[0] || "User";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#e8e8e8] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display',sans-serif]">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none pb-[100px]">

        {/* Header */}
        <MobileHeader />

        {/* Greeting */}
        <div className="px-5 py-3">
          <div className="text-[14px] text-[#888] mb-0.5">Good Afternoon ☀️</div>
          <div className="text-[28px] font-bold text-[#111]">{firstName}!</div>
        </div>

        {/* Balance Card */}
        <div className="px-5 py-2">
          <div className="bg-gradient-to-br from-[#2d6a4f] to-[#1b4332] rounded-[20px] p-6 shadow-[0_8px_24px_rgba(45,106,79,0.3)]">
            <div className="text-[11px] font-semibold tracking-[1.2px] text-white/65 mb-2">
              AVAILABLE BALANCE
            </div>
            <div className="text-4xl font-bold text-white mb-3 tracking-tight">
              {formatAmount(walletBalance)}
            </div>
            <div className="text-[12px] text-white/50">
              {lastTransactionTime}
            </div>
          </div>
        </div>

        {/* Total to Receive */}
        <div className="px-5 pt-2 pb-1">
          <div className="bg-gradient-to-br from-[#ecfdf5] to-[#d1fae5] rounded-[16px] p-4 flex justify-between items-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div>
              <div className="text-[11px] font-semibold tracking-[1px] text-[#888] mb-1.5">
                TOTAL TO RECEIVE
              </div>
              <div className="text-[22px] font-bold text-[#2d6a4f]">
                +{formatAmount(totalToReceive)}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#2d6a4f]/10 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-[18px] h-[18px] text-[#2d6a4f]" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Total to Pay */}
        <div className="px-5 py-1">
          <div className="bg-gradient-to-br from-[#fff5f5] to-[#fee2e2] rounded-[16px] p-4 flex justify-between items-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div>
              <div className="text-[11px] font-semibold tracking-[1px] text-[#888] mb-1.5">
                TOTAL TO PAY
              </div>
              <div className="text-[22px] font-bold text-[#b91c1c]">
                -{formatAmount(totalToPay)}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#b91c1c]/10 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-[18px] h-[18px] text-[#b91c1c]" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* After Settlements */}
        <div className="px-5 pt-1 pb-2">
          <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="text-[11px] font-semibold tracking-[1px] text-[#888] mb-2">
              AFTER SETTLEMENTS
            </div>
            <div className="flex justify-between items-end">
              <div className="text-[22px] font-bold text-[#111]">
                {formatAmount(afterSettlementsBalance)}
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold tracking-[0.8px] text-[#aaa] mb-1">
                  SETTLEMENT DELTA
                </div>
                <div className="flex items-center gap-1 justify-end">
                  {settlementDelta >= 0 ? (
                    <ArrowDownLeft className="w-3 h-3 text-[#2d6a4f]" strokeWidth={3} />
                  ) : (
                    <ArrowUpRight className="w-3 h-3 text-[#b91c1c]" strokeWidth={3} />
                  )}
                  <span className="text-[13px] font-semibold text-[#333]">
                    {formatAmount(Math.abs(settlementDelta))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Shortcuts */}
        <div className="px-5 py-2">
          <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="text-[11px] font-semibold tracking-[1px] text-[#888]">
                QUICK SHORTCUTS
              </div>
              <AIInsightsSheet trigger={
                <button className="text-[11px] font-semibold text-[#2d6a4f] px-2 py-0.5 rounded-full bg-[#ecfdf5]">
                  Insights ✨
                </button>
              } />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setInitialGroupIdForSheet(""); setShowAddExpense(true); }}
                className="flex-1 bg-[#ecfdf5] rounded-[14px] p-3 flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"
              >
                <div className="w-11 h-11 rounded-xl bg-[#d1fae5] flex items-center justify-center">
                  <Split className="w-[22px] h-[22px] text-[#2d6a4f]" strokeWidth={2} />
                </div>
                <span className="text-[12px] font-medium text-[#444]">Split Bill</span>
              </button>

              <button
                onClick={() => { setInitialGroupIdForSheet("personal"); setShowAddExpense(true); }}
                className="flex-1 bg-[#eff6ff] rounded-[14px] p-3 flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"
              >
                <div className="w-11 h-11 rounded-xl bg-[#dbeafe] flex items-center justify-center">
                  <UserPlus className="w-[22px] h-[22px] text-[#3b82f6]" strokeWidth={2} />
                </div>
                <span className="text-[12px] font-medium text-[#444]">Add Solo</span>
              </button>

              <button
                onClick={() => setShowRecordPayment(true)}
                className="flex-1 bg-[#ecfdf5] rounded-[14px] p-3 flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"
              >
                <div className="w-11 h-11 rounded-xl bg-[#d1fae5] flex items-center justify-center">
                  <Send className="w-[22px] h-[22px] text-[#2d6a4f]" strokeWidth={2} />
                </div>
                <span className="text-[12px] font-medium text-[#444]">Request</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="px-5 py-2 mb-4">
          <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="text-[11px] font-semibold tracking-[1px] text-[#888]">
                RECENT ACTIVITY
              </div>
              <button
                onClick={() => navigate('/activity')}
                className="text-[11px] font-semibold text-[#888] active:text-[#222]"
              >
                See All
              </button>
            </div>

            {recentActivity.length > 0 ? (
              <div className="flex flex-col gap-4">
                {recentActivity.map((tx, i) => (
                  <div key={tx.id || i} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        tx.type === "payment" ? "bg-emerald-100" : "bg-gray-100"
                      }`}>
                        {tx.type === "payment" ? (
                          <Send className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Split className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-semibold text-[#222] line-clamp-1 max-w-[180px]">
                          {tx.description}
                        </span>
                        <span className="text-[12px] text-[#888]">
                          {new Date(tx.timestamp || tx.date).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className={`text-[15px] font-bold ${
                      (tx.paidBy === user?.uid && tx.type !== "payment") || (tx.type === "payment" && tx.toMember === user?.uid)
                        ? "text-[#2d6a4f]"
                        : "text-[#222]"
                    }`}>
                      {formatAmount(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#888] text-[13px] py-4">
                {t('dashboard.no_tx_yet')}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#ebebeb] flex items-center justify-around px-0 pt-2.5 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40">
        <button onClick={() => handleTabChange("home")} className="flex flex-col items-center gap-[3px] bg-transparent border-none min-w-[50px] px-2">
          <Home className={`w-[22px] h-[22px] ${activeTab === 'home' ? 'text-[#2d6a4f]' : 'text-[#aaa]'}`} strokeWidth={1.8} />
          <span className={`text-[10px] font-medium ${activeTab === 'home' ? 'text-[#2d6a4f]' : 'text-[#aaa]'}`}>Home</span>
        </button>

        <button onClick={() => handleTabChange("groups")} className="flex flex-col items-center gap-[3px] bg-transparent border-none min-w-[50px] px-2">
          <Users className="w-[22px] h-[22px] text-[#aaa]" strokeWidth={1.8} />
          <span className="text-[10px] font-medium text-[#aaa]">Groups</span>
        </button>

        <button
          onClick={() => handleTabChange("add")}
          className="w-[54px] h-[54px] rounded-full bg-[#1b4332] flex items-center justify-center shadow-[0_4px_16px_rgba(27,67,50,0.4)] cursor-pointer mb-2 active:scale-95 transition-transform"
        >
          <PlusCircle className="w-[26px] h-[26px] text-white" strokeWidth={2} />
        </button>

        <button onClick={() => handleTabChange("activity")} className="flex flex-col items-center gap-[3px] bg-transparent border-none min-w-[50px] px-2">
          <Clock className="w-[22px] h-[22px] text-[#aaa]" strokeWidth={1.8} />
          <span className="text-[10px] font-medium text-[#aaa]">History</span>
        </button>

        <button onClick={() => handleTabChange("profile")} className="flex flex-col items-center gap-[3px] bg-transparent border-none min-w-[50px] px-2">
          <UserIcon className="w-[22px] h-[22px] text-[#aaa]" strokeWidth={1.8} />
          <span className="text-[10px] font-medium text-[#aaa]">Me</span>
        </button>
      </div>

      <AddExpenseSheet
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onAdd={handleCreateExpense}
        groups={groups}
        currentUserId={user?.uid || ""}
        initialGroupId={initialGroupIdForSheet}
      />

      <RecordPaymentSheet
        isOpen={showRecordPayment}
        onClose={() => setShowRecordPayment(false)}
      />

    </div>
  );
};

export default Dashboard;
