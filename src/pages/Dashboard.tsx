import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowDownLeft, Plus, User, CreditCard, Users, Wallet, Send, X, WifiOff, RefreshCw } from "@/lib/icons";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import AppContainer from "@/components/AppContainer";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import CreateGroupSheet from "@/components/CreateGroupSheet";
import AddMoneySheet from "@/components/AddMoneySheet";
import PaymentConfirmationSheet from "@/components/PaymentConfirmationSheet";
import PWAInstallButton from "@/components/PWAInstallButton";
import NotificationIcon from "@/components/NotificationIcon";
import OnboardingTour from "@/components/OnboardingTour";
import PageGuide from "@/components/PageGuide";
import ShareButton from "@/components/ShareButton";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData, type Transaction } from "@/contexts/FirebaseDataContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useOffline } from "@/hooks/useOffline";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, getWalletBalance, getTotalToReceive, getTotalToPay, getSettlementDelta } = useFirebaseAuth();
  const { groups, createGroup, addExpense, recordPayment, addMoneyToWallet, payMyDebt, getAllTransactions, addMemberToGroup } = useFirebaseData();
  const { isInstalled } = usePWAInstall();
  const { offline, pendingCount, isSyncing, syncNow } = useOffline();
  const {
    isSupported: notificationsSupported,
    permission: notificationPermission,
    requestPermission,
    subscribe: subscribeToPush,
    registerPeriodicSync
  } = usePushNotifications();
  const {
    shouldShowOnboarding,
    shouldShowPageGuide,
    markOnboardingComplete,
    markPageGuideShown
  } = useUserPreferences(user?.uid);

  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("home");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<{
    id: string;
    name: string;
    amount: number;
    groupId?: string;
  } | null>(null);

  // Onboarding and guide states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDashboardGuide, setShowDashboardGuide] = useState(false);

  // Tooltip states for mobile
  const [showBalanceTooltip, setShowBalanceTooltip] = useState(false);
  const [showSettlementsTooltip, setShowSettlementsTooltip] = useState(false);
  const [showDeltaTooltip, setShowDeltaTooltip] = useState(false);

  // Check if we should show onboarding or guides
  useEffect(() => {
    if (shouldShowOnboarding()) {
      setShowOnboarding(true);
    } else if (shouldShowPageGuide('dashboard')) {
      setShowDashboardGuide(true);
    }
  }, [shouldShowOnboarding, shouldShowPageGuide]);

  // Request notification permissions when app is installed
  useEffect(() => {
    const setupNotifications = async () => {
      if (isInstalled && notificationsSupported && notificationPermission === 'default') {
        // Wait a bit before asking for permissions (better UX)
        setTimeout(async () => {
          const granted = await requestPermission();
          if (granted) {
            // Subscribe to push notifications
            await subscribeToPush();
            // Register periodic sync
            await registerPeriodicSync();
          }
        }, 2000);
      }
    };

    setupNotifications();
  }, [isInstalled, notificationsSupported, notificationPermission, requestPermission, subscribeToPush, registerPeriodicSync]);

  // Onboarding steps
  const onboardingSteps = [
    {
      id: 'welcome',
      title: 'Welcome to Hostel Ledger! 🎉',
      description: 'Your smart companion for splitting expenses with friends, roommates, and groups. Let\'s get you started!',
      emoji: '👋'
    },
    {
      id: 'wallet',
      title: 'Your Digital Wallet 💰',
      description: 'This shows your available balance. Add money here and track what you can spend right now.',
      emoji: '💳'
    },
    {
      id: 'settlements',
      title: 'Smart Settlements 🧮',
      description: 'See who owes you money and who you need to pay. We calculate everything automatically!',
      emoji: '⚖️'
    },
    {
      id: 'actions',
      title: 'Quick Actions ⚡',
      description: 'Add expenses, record payments, and create groups with just a tap. Everything you need is here!',
      emoji: '🚀'
    },
    {
      id: 'ready',
      title: 'You\'re All Set! ✨',
      description: 'Start by creating your first group and adding your friends. Happy expense splitting!',
      emoji: '🎯'
    }
  ];

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    markOnboardingComplete();
    toast.success("Welcome aboard! 🎉");
  };

  const handleDashboardGuideClose = () => {
    setShowDashboardGuide(false);
    markPageGuideShown('dashboard');
  };

  // Get all transactions including wallet transactions
  const allTransactions = getAllTransactions();

  // Calculate time since last transaction
  const getTimeSinceLastTransaction = () => {
    if (allTransactions.length === 0) return "No transactions yet";

    const lastTransaction = allTransactions[0]; // Most recent transaction
    const lastTransactionTime = new Date(lastTransaction.timestamp || lastTransaction.date).getTime();
    const now = new Date().getTime();
    const diffInMinutes = Math.floor((now - lastTransactionTime) / (1000 * 60));

    if (diffInMinutes < 1) return "Updated just now";
    if (diffInMinutes === 1) return "Updated 1 min ago";
    if (diffInMinutes < 60) return `Updated ${diffInMinutes} mins ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return "Updated 1 hour ago";
    if (diffInHours < 24) return `Updated ${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "Updated 1 day ago";
    return `Updated ${diffInDays} days ago`;
  };

  const lastTransactionTime = getTimeSinceLastTransaction();

  // Group transactions by date (Today, Yesterday, Older)
  const groupTransactionsByDate = (transactions: Transaction[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayTransactions: Transaction[] = [];
    const yesterdayTransactions: Transaction[] = [];
    const olderTransactions: Transaction[] = [];

    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.timestamp || transaction.date);
      transactionDate.setHours(0, 0, 0, 0);

      if (transactionDate.getTime() === today.getTime()) {
        todayTransactions.push(transaction);
      } else if (transactionDate.getTime() === yesterday.getTime()) {
        yesterdayTransactions.push(transaction);
      } else {
        olderTransactions.push(transaction);
      }
    });

    return { todayTransactions, yesterdayTransactions, olderTransactions };
  };

  const { todayTransactions, yesterdayTransactions, olderTransactions } = groupTransactionsByDate(allTransactions);

  // Calculate totals using new settlement system
  const walletBalance = getWalletBalance();
  const settlementDelta = getSettlementDelta();
  const totalToReceive = getTotalToReceive();
  const totalToPay = getTotalToPay();

  // Calculate percentage change for after settlements
  const afterSettlementsBalance = walletBalance + settlementDelta;

  // Calculate day-to-day change for Settlement Delta using localStorage
  const calculateDayToDay = () => {
    if (!user?.uid) return { change: 0, direction: 'same' };

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];

    // Storage keys for daily settlement deltas
    const todayKey = `settlementDelta_${user.uid}_${today}`;
    const yesterdayStorageKey = `settlementDelta_${user.uid}_${yesterdayKey}`;

    // Store today's settlement delta
    localStorage.setItem(todayKey, settlementDelta.toString());

    // Get yesterday's settlement delta
    const yesterdaySettlementDelta = parseFloat(localStorage.getItem(yesterdayStorageKey) || '0');

    if (yesterdaySettlementDelta === 0 && settlementDelta === 0) {
      return { change: 0, direction: 'same' };
    }

    if (yesterdaySettlementDelta === 0) {
      return {
        change: Math.abs(settlementDelta),
        direction: settlementDelta > 0 ? 'up' : 'down',
        isFirstDay: true
      };
    }

    const absoluteChange = Math.abs(settlementDelta - yesterdaySettlementDelta);
    const percentChange = (absoluteChange / Math.abs(yesterdaySettlementDelta)) * 100;

    return {
      change: percentChange,
      direction: settlementDelta > yesterdaySettlementDelta ? 'up' : settlementDelta < yesterdaySettlementDelta ? 'down' : 'same',
      absoluteChange: absoluteChange,
      isFirstDay: false
    };
  };

  const dayToDay = calculateDayToDay();

  // Prepare groups data for sheets
  const groupsForSheets = useMemo(() => {
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      members: g.members.map((m) => ({ id: m.id, name: m.name })),
    }));
  }, [groups]);

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === "add") {
      if (groups.length === 0) {
        toast.error("Create a group first to add expenses");
        setShowCreateGroup(true);
      } else {
        setShowAddExpense(true);
      }
    } else if (tab === "profile") {
      navigate("/profile");
    } else if (tab === "groups") {
      navigate("/groups");
    } else if (tab === "activity") {
      navigate("/activity");
    } else {
      setActiveTab(tab);
    }
  };

  const handleAddExpense = () => {
    if (groups.length === 0) {
      toast.error("Create a group first to add expenses");
      setShowCreateGroup(true);
    } else {
      setShowAddExpense(true);
    }
  };

  const handleReceivedMoney = () => {
    if (offline) {
      toast.error("Internet required for recording payments", {
        description: "This feature needs an active connection",
        icon: "📴",
      });
      return;
    }
    if (groups.length === 0) {
      toast.error("Create a group first to record payments");
      setShowCreateGroup(true);
    } else if (totalToReceive <= 0) {
      toast.error("No pending payments to record. Nobody owes you money right now.");
    } else {
      setShowRecordPayment(true);
    }
  };

  const handleNewGroup = () => {
    if (offline) {
      toast.error("Internet required for creating groups", {
        description: "This feature needs an active connection",
        icon: "📴",
      });
      return;
    }
    setShowCreateGroup(true);
  };

  const handleExpenseSubmit = async (data: {
    groupId: string;
    amount: number;
    paidBy: string;
    participants: string[];
    note: string;
    place: string;
  }) => {
    try {
      const result = await addExpense({
        groupId: data.groupId,
        amount: data.amount,
        paidBy: data.paidBy,
        participants: data.participants,
        note: data.note,
        place: data.place,
      });

      if (result.success) {
        toast.success(`Added expense of Rs ${data.amount.toLocaleString()}`);
      } else {
        toast.error(result.error || "Failed to add expense");
      }
    } catch (error) {
      toast.error("Network error. Please check your Internet connection.");
    }
  };

  const handlePaymentSubmit = async (data: {
    groupId: string;
    fromMember: string;
    amount: number;
    method: "cash" | "online";
    note: string;
  }) => {
    if (!user) return;

    try {
      const result = await recordPayment({
        groupId: data.groupId,
        fromMember: data.fromMember,
        toMember: user.uid,
        amount: data.amount,
        method: data.method,
        note: data.note,
      });

      if (result.success) {
        const group = groups.find((g) => g.id === data.groupId);
        const memberName = group?.members.find((m) => m.id === data.fromMember)?.name;
        toast.success(`Recorded Rs ${data.amount.toLocaleString()} from ${memberName}`);
      } else {
        toast.error(result.error || "Failed to record payment");
      }
    } catch (error) {
      toast.error("Network error. Please check your Internet connection.");
    }
  };

  const handleGroupSubmit = async (data: {
    name: string;
    emoji: string;
    members: { name: string; phone?: string; paymentDetails?: { jazzCash?: string; easypaisa?: string; bankName?: string; accountNumber?: string; raastId?: string } }[];
  }) => {
    const result = await createGroup({
      name: data.name,
      emoji: data.emoji,
      members: data.members.map((m) => ({
        name: m.name,
        phone: m.phone,
        paymentDetails: m.paymentDetails,
      })),
    });

    if (result.success) {
      toast.success(`Created group "${data.name}"`);
    } else {
      toast.error(result.error || "Failed to create group");
    }
  };

  const handleAddMoney = async (amount: number, note?: string) => {
    const result = await addMoneyToWallet(amount, note);
    if (result.success) {
      toast.success(`Added Rs ${amount} to wallet`);
    } else {
      toast.error(result.error || "Failed to add money");
    }
  };

  const handlePaymentConfirmation = async (memberId: string, amount: number) => {
    // Find the group and member
    let targetGroup = null;
    let targetMember = null;

    for (const group of groups) {
      const member = group.members.find(m => m.id === memberId);
      if (member) {
        targetGroup = group;
        targetMember = member;
        break;
      }
    }

    if (!targetGroup || !targetMember) {
      return { success: false, error: "Member not found" };
    }

    const result = await payMyDebt(targetGroup.id, memberId, amount);
    if (result.success) {
      toast.success(`Paid Rs ${amount} to ${targetMember.name}`);
    } else {
      toast.error(result.error || "Payment failed");
    }
    return result;
  };

  // Get greeting based on time with emoji
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", emoji: "" };
    if (hour < 17) return { text: "Good afternoon", emoji: "☀️" };
    return { text: "Good evening", emoji: "🌙" };
  };

  const greeting = getGreeting();

  // Transaction detail modal component - iPhone Style
  const TransactionDetailModal = ({ transaction, onClose }: { transaction: any; onClose: () => void }) => {
    if (!transaction) return null;

    // Find the group for this transaction
    const transactionGroup = groups.find(g => g.id === transaction.groupId);

    return (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md max-h-[90vh] overflow-hidden rounded-3xl shadow-[0_25px_70px_rgba(74,104,80,0.3)] border border-[#4a6850]/10 mx-auto">
          {/* Header with close button - iPhone Style */}
          <div className="flex items-center justify-between p-4 lg:p-6 border-b border-[#4a6850]/10 bg-gradient-to-r from-[#4a6850]/5 to-[#3d5643]/5 flex-shrink-0">
            <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
              <div className={`w-10 lg:w-12 h-10 lg:h-12 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-lg flex-shrink-0 ${transaction.type === 'expense' ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' :
                transaction.type === 'payment' ? 'bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white' : 'bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white'
                }`}>
                {transaction.type === 'expense' ? (
                  <ArrowUpRight className="w-5 lg:w-6 h-5 lg:h-6 font-bold" />
                ) : transaction.type === 'payment' ? (
                  <ArrowDownLeft className="w-5 lg:w-6 h-5 lg:h-6 font-bold" />
                ) : (
                  <CreditCard className="w-5 lg:w-6 h-5 lg:h-6 font-bold" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-gray-900 text-base lg:text-lg tracking-tight truncate">Transaction Details</h2>
                <p className="text-xs lg:text-sm text-[#4a6850]/80 capitalize font-medium truncate">{transaction.type}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95 flex-shrink-0 ml-3 lg:ml-4"
            >
              <X className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" strokeWidth={3} />
            </button>
          </div>

          {/* Scrollable content - iPhone Style */}
          <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            <div className="p-4 lg:p-6">
              {/* Transaction header - iPhone Style */}
              <div className="text-center mb-6 lg:mb-8">
                <h3 className="text-lg lg:text-2xl font-bold text-gray-900 mb-2 lg:mb-3 tracking-tight truncate px-2">{transaction.title}</h3>
                <div className="text-3xl lg:text-5xl font-black text-gray-900 mb-1.5 lg:mb-2 tracking-tighter tabular-nums">
                  Rs {transaction.amount.toLocaleString()}
                </div>
                <div className="text-xs lg:text-sm text-[#4a6850]/80 font-medium">
                  {transaction.date}
                  {transaction.timestamp && ` • ${new Date(transaction.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                </div>
              </div>

              <div className="space-y-3 lg:space-y-4">
                {/* Group Information - iPhone Style */}
                {transactionGroup && (
                  <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <Users className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Group</div>
                      <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">{transactionGroup.name}</div>
                      <div className="text-xs lg:text-sm text-[#4a6850]/80 font-medium">{transactionGroup.members.length} members</div>
                    </div>
                  </div>
                )}

                {/* Paid By (for expenses) - iPhone Style */}
                {transaction.paidByName && (
                  <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <User className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Paid by</div>
                      <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">{transaction.paidByName}</div>
                    </div>
                  </div>
                )}

                {/* Payment Details (for payments) - iPhone Style */}
                {transaction.fromName && transaction.toName && (
                  <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <ArrowUpRight className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Payment</div>
                      <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">{transaction.fromName} → {transaction.toName}</div>
                      {transaction.method && (
                        <div className="text-xs lg:text-sm text-[#4a6850]/80 capitalize font-medium">via {transaction.method}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Participants (for expenses) - iPhone Style */}
                {transaction.participants && transaction.participants.length > 0 && (
                  <div className="p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-3 lg:mb-4 font-semibold uppercase tracking-wide">Participants ({transaction.participants.length})</div>
                    <div className="space-y-2 lg:space-y-3 max-h-32 overflow-y-auto">
                      {transaction.participants.map((participant: any, index: number) => (
                        <div key={index} className="flex justify-between items-center gap-2">
                          <span className="font-semibold text-gray-900 truncate flex-1 text-sm lg:text-base">{participant.name}</span>
                          <span className="text-xs lg:text-sm text-[#4a6850] flex-shrink-0 font-bold tabular-nums">Rs {participant.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Place (for expenses) - iPhone Style */}
                {transaction.place && (
                  <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <div className="w-5 lg:w-6 h-5 lg:h-6 rounded-full bg-[#4a6850]/20 flex-shrink-0 flex items-center justify-center">
                      <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-[#4a6850]"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Place</div>
                      <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">{transaction.place}</div>
                    </div>
                  </div>
                )}

                {/* Note - iPhone Style */}
                {transaction.note && (
                  <div className="p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-2 lg:mb-3 font-semibold uppercase tracking-wide">Note</div>
                    <div className="font-medium text-gray-900 break-words leading-relaxed text-sm lg:text-base">{transaction.note}</div>
                  </div>
                )}

                {/* Wallet Balance Changes (for wallet transactions) - iPhone Style */}
                {(transaction.walletBalanceBefore !== undefined || transaction.walletBalanceAfter !== undefined) && (
                  <div className="space-y-3 lg:space-y-4">
                    {transaction.walletBalanceBefore !== undefined && (
                      <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl lg:rounded-3xl border border-gray-200 shadow-lg">
                        <CreditCard className="w-5 lg:w-6 h-5 lg:h-6 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] lg:text-xs text-gray-500 font-semibold uppercase tracking-wide">Wallet Balance Before</div>
                          <div className="font-bold text-gray-900 text-sm lg:text-base tracking-tight tabular-nums">Rs {transaction.walletBalanceBefore.toLocaleString()}</div>
                        </div>
                      </div>
                    )}

                    {transaction.walletBalanceAfter !== undefined && (
                      <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                        <CreditCard className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Wallet Balance After</div>
                          <div className="font-bold text-gray-900 text-sm lg:text-base tracking-tight tabular-nums">Rs {transaction.walletBalanceAfter.toLocaleString()}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed footer with close button - iPhone Style */}
          <div className="p-6 border-t border-[#4a6850]/10 bg-white flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar />

      <AppContainer>
        {/* Desktop Header */}
        <DesktopHeader />

        {/* Mobile Header - Minimalist Style with Real Logo */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#F8F9FA]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/only-logo.png"
              alt="Hostel Ledger"
              className="w-10 h-10 rounded-xl shadow-lg"
            />
            <div>
              <h1 className="text-xs font-bold uppercase tracking-widest text-gray-500">Hostel Ledger</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Offline/Sync Indicator */}
            {offline ? (
              <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">
                <WifiOff className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-xs font-bold text-orange-700">Offline</span>
                {pendingCount > 0 && (
                  <span className="ml-1 bg-orange-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </div>
            ) : pendingCount > 0 ? (
              <button
                onClick={syncNow}
                disabled={isSyncing}
                className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="text-xs font-bold text-blue-700">Sync {pendingCount}</span>
              </button>
            ) : null}

            {isInstalled ? (
              <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600">
                <NotificationIcon />
              </button>
            ) : (
              <PWAInstallButton />
            )}
            <button
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden"
            >
              <div className="w-full h-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center">
                <span className="text-lg font-black text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
            </button>
          </div>
        </header>

        <main className="px-6 lg:px-8 space-y-8 lg:max-w-7xl lg:mx-auto pb-24">
          {/* Greeting Section - Moved further down with more spacing */}
          <section className="mt-16 lg:mt-20 mb-10 lg:mb-12">
            <p className="text-gray-500 font-semibold text-sm">Welcome back,</p>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-gray-900">{user?.name || "User"}</h2>
          </section>

          {/* PRIMARY CARD: Enhanced with last transaction time - Moved further down */}
          <section className="mesh-gradient rounded-3xl p-5 lg:p-6 text-white shadow-2xl shadow-[#4a6850]/30 relative">
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  {/* Mobile: Click to toggle, Desktop: Hover */}
                  <div className="lg:hidden">
                    <button
                      onClick={() => setShowBalanceTooltip(!showBalanceTooltip)}
                      className="text-white/70 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 active:text-white transition-colors"
                    >
                      Available Balance
                      <span className="w-4 h-4 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[10px] active:bg-white/30 active:scale-95 transition-all">?</span>
                    </button>
                    {showBalanceTooltip && (
                      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowBalanceTooltip(false)}>
                        <div className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center flex-shrink-0 shadow-lg">
                              <span className="text-xl">💰</span>
                            </div>
                            <div>
                              <h4 className="font-black text-sm mb-1.5 text-gray-900">Available Balance</h4>
                              <p className="text-xs leading-relaxed text-gray-600 font-medium">Your current wallet balance that you can spend right now. This doesn't include pending settlements.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowBalanceTooltip(false)}
                            className="mt-4 w-full py-2 bg-[#4a6850] text-white rounded-xl font-bold text-sm"
                          >
                            Got it
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button className="text-white/70 text-xs font-black uppercase tracking-wider cursor-help inline-flex items-center gap-1.5 hover:text-white/90 transition-colors">
                          Available Balance
                          <span className="w-4 h-4 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[10px] hover:bg-white/25 hover:scale-110 transition-all">?</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-xl">💰</span>
                          </div>
                          <div>
                            <h4 className="font-black text-sm mb-1.5 text-gray-900">Available Balance</h4>
                            <p className="text-xs leading-relaxed text-gray-600 font-medium">Your current wallet balance that you can spend right now. This doesn't include pending settlements.</p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <h3 className="text-3xl lg:text-4xl font-black mt-1 tracking-tighter text-white tabular-nums">Rs {walletBalance.toLocaleString()}</h3>
                  {/* Last transaction time - smaller on mobile */}
                  <p className="text-white/40 text-[10px] lg:text-xs mt-1.5 lg:mt-2 font-semibold">{lastTransactionTime}</p>
                </div>
                <button
                  onClick={() => setShowAddMoney(true)}
                  className="glass p-2.5 lg:p-3 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                >
                  <Plus className="w-4 lg:w-5 h-4 lg:h-5 text-white" />
                </button>
              </div>

              <div className="mt-6 lg:mt-8 p-4 lg:p-5 flex justify-between items-center gap-4" style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '2rem',
                boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.2)'
              }}>
                <div className="flex-1 min-w-0">
                  {/* Mobile: Click to toggle, Desktop: Hover */}
                  <div className="lg:hidden">
                    <button
                      onClick={() => setShowSettlementsTooltip(!showSettlementsTooltip)}
                      className="text-white/60 text-[9px] uppercase font-black mb-1 inline-flex items-center gap-1 active:text-white transition-colors"
                    >
                      After settlements
                      <span className="w-3.5 h-3.5 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[8px] active:bg-white/30 active:scale-95 transition-all">?</span>
                    </button>
                    {showSettlementsTooltip && (
                      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowSettlementsTooltip(false)}>
                        <div className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                              <span className="text-xl">📊</span>
                            </div>
                            <div>
                              <h4 className="font-black text-sm mb-1.5 text-gray-900">After Settlements</h4>
                              <p className="text-xs leading-relaxed text-gray-600 font-medium">Your balance after all pending payments are settled. This is what you'll have once everyone pays what they owe.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowSettlementsTooltip(false)}
                            className="mt-4 w-full py-2 bg-[#4a6850] text-white rounded-xl font-bold text-sm"
                          >
                            Got it
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button className="text-white/60 text-[10px] uppercase font-black mb-1 cursor-help inline-flex items-center gap-1 hover:text-white/80 transition-colors">
                          After settlements
                          <span className="w-3.5 h-3.5 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[8px] hover:bg-white/25 hover:scale-110 transition-all">?</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-xl">📊</span>
                          </div>
                          <div>
                            <h4 className="font-black text-sm mb-1.5 text-gray-900">After Settlements</h4>
                            <p className="text-xs leading-relaxed text-gray-600 font-medium">Your balance after all pending payments are settled. This is what you'll have once everyone pays what they owe.</p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-base lg:text-lg font-black text-white tabular-nums truncate tracking-tight">Rs {afterSettlementsBalance.toLocaleString()}</p>
                </div>
                <div className="text-right flex-shrink-0 min-w-0">
                  {/* Mobile: Click to toggle, Desktop: Hover */}
                  <div className="lg:hidden">
                    <button
                      onClick={() => setShowDeltaTooltip(!showDeltaTooltip)}
                      className="text-white/60 text-[9px] uppercase font-black mb-1 truncate inline-flex items-center gap-1 active:text-white transition-colors"
                    >
                      Settlement Delta
                      <span className="w-3.5 h-3.5 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[8px] active:bg-white/30 active:scale-95 transition-all">?</span>
                    </button>
                    {showDeltaTooltip && (
                      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowDeltaTooltip(false)}>
                        <div className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                              <span className="text-xl">📈</span>
                            </div>
                            <div>
                              <h4 className="font-black text-sm mb-1.5 text-gray-900">Settlement Delta</h4>
                              <p className="text-xs leading-relaxed text-gray-600 font-medium">The net amount you'll gain (+) or lose (-) after all settlements. Green means you'll receive money, red means you owe money.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowDeltaTooltip(false)}
                            className="mt-4 w-full py-2 bg-[#4a6850] text-white rounded-xl font-bold text-sm"
                          >
                            Got it
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button className="text-white/60 text-[10px] uppercase font-black mb-1 truncate cursor-help inline-flex items-center gap-1 hover:text-white/80 transition-colors">
                          Settlement Delta
                          <span className="w-3.5 h-3.5 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[8px] hover:bg-white/25 hover:scale-110 transition-all">?</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-xl">📈</span>
                          </div>
                          <div>
                            <h4 className="font-black text-sm mb-1.5 text-gray-900">Settlement Delta</h4>
                            <p className="text-xs leading-relaxed text-gray-600 font-medium">The net amount you'll gain (+) or lose (-) after all settlements. Green means you'll receive money, red means you owe money.</p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className={`flex items-center justify-end ${settlementDelta > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {dayToDay.direction !== 'same' && (
                      <span className="text-xs lg:text-sm mr-1 flex-shrink-0">
                        {dayToDay.direction === 'up' ? '▲' : '▼'}
                      </span>
                    )}
                    <span className="font-black text-sm lg:text-base tabular-nums truncate tracking-tight">{settlementDelta > 0 ? '+' : ''}{settlementDelta < 0 ? '-' : ''}Rs {Math.abs(settlementDelta).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECONDARY CARDS: To Receive and You Owe - Android Style */}
          {/* Mobile Version - Android Material Design Style */}
          <section className="lg:hidden grid grid-cols-2 gap-4 mb-8">
            {/* To Receive Card - Android Style with Your Theme */}
            <button
              onClick={() => navigate("/to-receive")}
              className="bg-gradient-to-br from-[#e8f5e9] to-[#f1f8f4] p-5 rounded-3xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left relative overflow-hidden group"
            >
              {/* Decorative circle */}
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#4a6850]/5 rounded-full"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#4a6850]/10 flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5 text-[#4a6850]" strokeWidth={2.5} />
                  </div>
                </div>

                <p className="text-[11px] font-bold text-[#4a6850]/70 mb-1.5 tracking-wide">TO RECEIVE</p>
                <h4 className="text-2xl font-black text-[#4a6850] tabular-nums tracking-tight mb-2">
                  Rs {totalToReceive.toLocaleString()}
                </h4>

                <div className="flex items-center gap-1 text-[#4a6850] font-bold text-xs">
                  <span>View details</span>
                  <span className="text-base group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </div>
            </button>

            {/* You Owe Card - Android Style with Your Theme */}
            <button
              onClick={() => navigate("/to-pay")}
              className="bg-gradient-to-br from-[#fef3f2] to-[#fef8f7] p-5 rounded-3xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left relative overflow-hidden group"
            >
              {/* Decorative circle */}
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/5 rounded-full"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-rose-500" strokeWidth={2.5} />
                  </div>
                </div>

                <p className="text-[11px] font-bold text-rose-500/70 mb-1.5 tracking-wide">YOU OWE</p>
                <h4 className="text-2xl font-black text-rose-500 tabular-nums tracking-tight mb-2">
                  Rs {totalToPay.toLocaleString()}
                </h4>

                <div className="flex items-center gap-1 text-rose-500 font-bold text-xs">
                  <span>Settle now</span>
                  <span className="text-base group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </div>
            </button>
          </section>

          {/* Desktop Version - Android Material Design Style */}
          <section className="hidden lg:grid grid-cols-2 gap-6 mb-12">
            {/* To Receive Card - Desktop Android Style */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/to-receive")}
                  className="bg-gradient-to-br from-[#e8f5e9] to-[#f1f8f4] p-8 rounded-3xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all text-left relative overflow-hidden group"
                >
                  {/* Decorative circles */}
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#4a6850]/5 rounded-full"></div>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#4a6850]/5 rounded-full"></div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-[#4a6850]/10 flex items-center justify-center">
                        <ArrowDownLeft className="w-7 h-7 text-[#4a6850]" strokeWidth={2.5} />
                      </div>
                    </div>

                    <p className="text-xs font-bold text-[#4a6850]/70 mb-2 tracking-wide">TO RECEIVE</p>
                    <h4 className="text-4xl font-black text-[#4a6850] tabular-nums tracking-tight mb-4">
                      Rs {totalToReceive.toLocaleString()}
                    </h4>

                    <div className="flex items-center gap-1.5 text-[#4a6850] font-bold text-sm">
                      <span>{totalToReceive <= 0 ? 'All settled up! 🎉' : 'View details'}</span>
                      {totalToReceive > 0 && <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>}
                    </div>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-xl">💵</span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm mb-1.5 text-gray-900">To Receive</h4>
                    <p className="text-xs leading-relaxed text-gray-600 font-medium">Total amount others owe you from shared expenses. Click to see who owes you and record payments.</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* You Owe Card - Desktop Android Style */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/to-pay")}
                  className="bg-gradient-to-br from-[#fef3f2] to-[#fef8f7] p-8 rounded-3xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all text-left relative overflow-hidden group"
                >
                  {/* Decorative circles */}
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-rose-500/5 rounded-full"></div>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-500/5 rounded-full"></div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                        <ArrowUpRight className="w-7 h-7 text-rose-500" strokeWidth={2.5} />
                      </div>
                    </div>

                    <p className="text-xs font-bold text-rose-500/70 mb-2 tracking-wide">YOU OWE</p>
                    <h4 className="text-4xl font-black text-rose-500 tabular-nums tracking-tight mb-4">
                      Rs {totalToPay.toLocaleString()}
                    </h4>

                    <div className="flex items-center gap-1.5 text-rose-500 font-bold text-sm">
                      <span>Settle now</span>
                      <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-xl">💳</span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm mb-1.5 text-gray-900">You Owe</h4>
                    <p className="text-xs leading-relaxed text-gray-600 font-medium">Total amount you owe to others from shared expenses. Click to see who you need to pay and settle your debts.</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </section>

          {/* Quick Actions */}
          {/* Mobile Version - Original Icon Grid */}
          <section className="lg:hidden mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Quick Actions</h3>
              <button className="text-xs font-black text-primary dark:text-emerald-400">View All</button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={handleAddExpense}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white text-center">Split Bill</span>
              </button>

              <button
                onClick={handleNewGroup}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white text-center">New Group</span>
              </button>

              <button
                onClick={handleReceivedMoney}
                disabled={totalToReceive <= 0}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all ${totalToReceive <= 0 ? 'opacity-50' : ''}`}
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white text-center">Received</span>
              </button>

              <button
                onClick={() => setShowAddMoney(true)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white text-center">Top Up</span>
              </button>
            </div>
          </section>

          {/* Desktop Version - Enhanced Large Cards */}
          <section className="hidden lg:block">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {/* Add Expense - PRIMARY ACTION with enhanced styling */}
              <button
                onClick={handleAddExpense}
                className="group cursor-pointer bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 p-8 rounded-3xl border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-left relative overflow-hidden"
              >
                {/* Gradient ring effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg">
                    <Plus className="w-9 h-9 font-bold" />
                  </div>
                  <h5 className="text-xl font-black mb-2 tracking-tighter text-emerald-900 dark:text-emerald-100">Add Expense</h5>
                  <p className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold">Easily split a new bill with friends or groups.</p>
                </div>
              </button>

              <button
                onClick={handleReceivedMoney}
                disabled={totalToReceive <= 0}
                className={`group cursor-pointer bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-slate-400/50 hover:shadow-xl hover:shadow-slate-900/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-left ${totalToReceive <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Send className="w-8 h-8" />
                </div>
                <h5 className="text-xl font-black mb-2 tracking-tighter">Settlements</h5>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
                  {totalToReceive <= 0 ? 'No pending settlements for this month.' : 'Record payments you received.'}
                </p>
              </button>

              <button
                onClick={handleNewGroup}
                className="group cursor-pointer bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-left"
              >
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8" />
                </div>
                <h5 className="text-xl font-black mb-2 tracking-tighter">New Group</h5>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Start sharing expenses with a new circle.</p>
              </button>
            </div>
          </section>

          {/* Recent Activity */}
          {/* Mobile Version - With Date Grouping */}
          <section className="lg:hidden mt-8">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-black tracking-tighter text-sm">Recent Activity</h3>
                {allTransactions.length > 3 && (
                  <button
                    onClick={() => navigate("/activity")}
                    className="text-xs font-black text-primary dark:text-emerald-400"
                  >
                    View All
                  </button>
                )}
              </div>

              {allTransactions.length > 0 ? (
                <div className="p-3">
                  {/* Today's Transactions */}
                  {todayTransactions.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Today</h4>
                      </div>
                      {todayTransactions.slice(0, 3).map((transaction) => {
                        const transactionGroup = groups.find(g => g.id === transaction.groupId);
                        const typeLabel = transaction.type === 'expense'
                          ? (transaction.paidBy === user?.uid ? 'You paid' : 'Expense')
                          : transaction.type === 'payment'
                            ? 'Payment received'
                            : 'Wallet';

                        return (
                          <button
                            key={transaction.id}
                            onClick={() => setSelectedTransaction(transaction)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.99] transition-all text-left"
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${transaction.type === 'expense'
                              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                              }`}>
                              {transaction.type === 'expense' ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : transaction.type === 'payment' ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : (
                                <CreditCard className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{transaction.title}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {typeLabel}
                                {transactionGroup && ` • ${transactionGroup.name}`}
                                {' • '}
                                {new Date(transaction.timestamp || transaction.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`font-black text-sm tabular-nums ${transaction.type === 'expense' ? 'text-rose-500' : 'text-slate-900 dark:text-white'
                                }`}>
                                Rs {transaction.amount.toLocaleString()}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Yesterday's Transactions */}
                  {yesterdayTransactions.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Yesterday</h4>
                      </div>
                      {yesterdayTransactions.slice(0, 2).map((transaction) => {
                        const transactionGroup = groups.find(g => g.id === transaction.groupId);
                        const typeLabel = transaction.type === 'expense'
                          ? (transaction.paidBy === user?.uid ? 'You paid' : 'Expense')
                          : transaction.type === 'payment'
                            ? 'Payment received'
                            : 'Wallet';

                        return (
                          <button
                            key={transaction.id}
                            onClick={() => setSelectedTransaction(transaction)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.99] transition-all text-left"
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${transaction.type === 'expense'
                              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                              }`}>
                              {transaction.type === 'expense' ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : transaction.type === 'payment' ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : (
                                <CreditCard className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{transaction.title}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {typeLabel}
                                {transactionGroup && ` • ${transactionGroup.name}`}
                                {' • '}
                                {new Date(transaction.timestamp || transaction.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`font-black text-sm tabular-nums ${transaction.type === 'expense' ? 'text-rose-500' : 'text-slate-900 dark:text-white'
                                }`}>
                                Rs {transaction.amount.toLocaleString()}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Older Transactions */}
                  {olderTransactions.length > 0 && (todayTransactions.length + yesterdayTransactions.length < 3) && (
                    <div>
                      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Older</h4>
                      </div>
                      {olderTransactions.slice(0, 3 - todayTransactions.length - yesterdayTransactions.length).map((transaction) => {
                        const transactionGroup = groups.find(g => g.id === transaction.groupId);
                        const typeLabel = transaction.type === 'expense'
                          ? (transaction.paidBy === user?.uid ? 'You paid' : 'Expense')
                          : transaction.type === 'payment'
                            ? 'Payment received'
                            : 'Wallet';

                        return (
                          <button
                            key={transaction.id}
                            onClick={() => setSelectedTransaction(transaction)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.99] transition-all text-left"
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${transaction.type === 'expense'
                              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                              }`}>
                              {transaction.type === 'expense' ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : transaction.type === 'payment' ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : (
                                <CreditCard className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{transaction.title}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {typeLabel}
                                {transactionGroup && ` • ${transactionGroup.name}`}
                                {' • '}
                                {transaction.date}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`font-black text-sm tabular-nums ${transaction.type === 'expense' ? 'text-rose-500' : 'text-slate-900 dark:text-white'
                                }`}>
                                Rs {transaction.amount.toLocaleString()}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#4a6850]/20 to-[#5a7860]/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">💸</span>
                  </div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1 tracking-tight">Ready to get started?</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4 text-xs">Your financial journey begins here! 🚀</p>
                  <button
                    onClick={groups.length === 0 ? handleNewGroup : handleAddExpense}
                    className="py-2 px-4 bg-gradient-to-r from-[#4a6850] to-[#5a7860] text-white font-bold text-sm rounded-xl active:scale-95 transition-all"
                  >
                    {groups.length === 0 ? "Create Your First Group" : "Add Your First Expense"}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Desktop Version - Enhanced with Date Grouping */}
          <section className="hidden lg:block mt-12">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-black tracking-tighter">Recent Activity</h3>
                {allTransactions.length > 3 && (
                  <button
                    onClick={() => navigate("/activity")}
                    className="text-sm font-black text-primary dark:text-emerald-400 hover:underline"
                  >
                    View All
                  </button>
                )}
              </div>

              {allTransactions.length > 0 ? (
                <div className="p-4">
                  {/* Today's Transactions */}
                  {todayTransactions.length > 0 && (
                    <div className="mb-6">
                      <div className="px-4 py-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Today</h4>
                      </div>
                      {todayTransactions.slice(0, 3).map((transaction) => {
                        const transactionGroup = groups.find(g => g.id === transaction.groupId);
                        const typeLabel = transaction.type === 'expense'
                          ? (transaction.paidBy === user?.uid ? 'You paid' : 'Expense')
                          : transaction.type === 'payment'
                            ? 'Payment received'
                            : 'Wallet';

                        return (
                          <button
                            key={transaction.id}
                            onClick={() => setSelectedTransaction(transaction)}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:scale-[1.01] active:scale-[0.99] transition-all text-left"
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${transaction.type === 'expense'
                              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                              }`}>
                              {transaction.type === 'expense' ? (
                                <ArrowUpRight className="w-5 h-5" />
                              ) : transaction.type === 'payment' ? (
                                <ArrowDownLeft className="w-5 h-5" />
                              ) : (
                                <CreditCard className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{transaction.title}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {typeLabel}
                                {transactionGroup && ` • ${transactionGroup.name}`}
                                {' • '}
                                {new Date(transaction.timestamp || transaction.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`font-black tabular-nums ${transaction.type === 'expense' ? 'text-rose-500' : 'text-slate-900 dark:text-white'
                                }`}>
                                Rs {transaction.amount.toLocaleString()}
                              </p>
                              <p className="text-xs text-slate-400">
                                {transaction.type === 'expense'
                                  ? (transaction.paidBy === user?.uid ? 'Paid by you' : 'You owe')
                                  : 'Received'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Yesterday's Transactions */}
                  {yesterdayTransactions.length > 0 && (
                    <div className="mb-6">
                      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Yesterday</h4>
                      </div>
                      {yesterdayTransactions.slice(0, 2).map((transaction) => {
                        const transactionGroup = groups.find(g => g.id === transaction.groupId);
                        const typeLabel = transaction.type === 'expense'
                          ? (transaction.paidBy === user?.uid ? 'You paid' : 'Expense')
                          : transaction.type === 'payment'
                            ? 'Payment received'
                            : 'Wallet';

                        return (
                          <button
                            key={transaction.id}
                            onClick={() => setSelectedTransaction(transaction)}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:scale-[1.01] active:scale-[0.99] transition-all text-left"
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${transaction.type === 'expense'
                              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                              }`}>
                              {transaction.type === 'expense' ? (
                                <ArrowUpRight className="w-5 h-5" />
                              ) : transaction.type === 'payment' ? (
                                <ArrowDownLeft className="w-5 h-5" />
                              ) : (
                                <CreditCard className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{transaction.title}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {typeLabel}
                                {transactionGroup && ` • ${transactionGroup.name}`}
                                {' • '}
                                {new Date(transaction.timestamp || transaction.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`font-black tabular-nums ${transaction.type === 'expense' ? 'text-rose-500' : 'text-slate-900 dark:text-white'
                                }`}>
                                Rs {transaction.amount.toLocaleString()}
                              </p>
                              <p className="text-xs text-slate-400">
                                {transaction.type === 'expense'
                                  ? (transaction.paidBy === user?.uid ? 'Paid by you' : 'You owe')
                                  : 'Received'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Older Transactions */}
                  {olderTransactions.length > 0 && (todayTransactions.length + yesterdayTransactions.length < 3) && (
                    <div>
                      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Older</h4>
                      </div>
                      {olderTransactions.slice(0, 3 - todayTransactions.length - yesterdayTransactions.length).map((transaction) => {
                        const transactionGroup = groups.find(g => g.id === transaction.groupId);
                        const typeLabel = transaction.type === 'expense'
                          ? (transaction.paidBy === user?.uid ? 'You paid' : 'Expense')
                          : transaction.type === 'payment'
                            ? 'Payment received'
                            : 'Wallet';

                        return (
                          <button
                            key={transaction.id}
                            onClick={() => setSelectedTransaction(transaction)}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:scale-[1.01] active:scale-[0.99] transition-all text-left"
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${transaction.type === 'expense'
                              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                              }`}>
                              {transaction.type === 'expense' ? (
                                <ArrowUpRight className="w-5 h-5" />
                              ) : transaction.type === 'payment' ? (
                                <ArrowDownLeft className="w-5 h-5" />
                              ) : (
                                <CreditCard className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{transaction.title}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {typeLabel}
                                {transactionGroup && ` • ${transactionGroup.name}`}
                                {' • '}
                                {transaction.date}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`font-black tabular-nums ${transaction.type === 'expense' ? 'text-rose-500' : 'text-slate-900 dark:text-white'
                                }`}>
                                Rs {transaction.amount.toLocaleString()}
                              </p>
                              <p className="text-xs text-slate-400">
                                {transaction.type === 'expense'
                                  ? (transaction.paidBy === user?.uid ? 'Paid by you' : 'You owe')
                                  : 'Received'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#4a6850]/20 to-[#5a7860]/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💸</span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 tracking-tight">Ready to get started?</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Your financial journey begins here! 🚀</p>
                  <button
                    onClick={groups.length === 0 ? handleNewGroup : handleAddExpense}
                    className="py-3 px-6 bg-gradient-to-r from-[#4a6850] to-[#5a7860] text-white font-black rounded-2xl hover:from-[#3d5643] hover:to-[#4a6850] hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {groups.length === 0 ? "🎉 Create Your First Group" : "Add Your First Expense"}
                  </button>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <TransactionDetailModal
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
          />
        )}

        {/* Onboarding Tour */}
        <OnboardingTour
          open={showOnboarding}
          onClose={handleOnboardingComplete}
          steps={onboardingSteps}
        />

        {/* Dashboard Page Guide */}
        <PageGuide
          title="Dashboard Overview"
          description="This is your financial command center! Here you can see your balance, pending settlements, and recent activity."
          tips={[
            "Tap the wallet card to add money",
            "Use quick actions to split bills instantly",
            "Check recent activity to track all transactions"
          ]}
          emoji="🏠"
          show={showDashboardGuide}
          onClose={handleDashboardGuideClose}
        />

        {/* Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Sheets */}
        {groups.length > 0 && (
          <AddExpenseSheet
            open={showAddExpense}
            onClose={() => setShowAddExpense(false)}
            groups={groupsForSheets}
            onSubmit={handleExpenseSubmit}
            onAddMember={async (groupId, data) => {
              const result = await addMemberToGroup(groupId, data);
              if (result.success) {
                toast.success(`Added temporary member: ${data.name}`);
              } else {
                toast.error(result.error || "Failed to add member");
              }
            }}
          />
        )}

        {groups.length > 0 && (
          <RecordPaymentSheet
            open={showRecordPayment}
            onClose={() => setShowRecordPayment(false)}
            groups={groupsForSheets}
            onSubmit={handlePaymentSubmit}
          />
        )}

        <CreateGroupSheet
          open={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onSubmit={handleGroupSubmit}
        />

        <AddMoneySheet
          open={showAddMoney}
          onClose={() => setShowAddMoney(false)}
          onSubmit={handleAddMoney}
        />

        <PaymentConfirmationSheet
          open={showPaymentConfirmation}
          onClose={() => {
            setShowPaymentConfirmation(false);
            setSelectedMemberForPayment(null);
          }}
          member={selectedMemberForPayment}
          onConfirmPayment={handlePaymentConfirmation}
        />
      </AppContainer>
    </>
  );
};

export default Dashboard;
