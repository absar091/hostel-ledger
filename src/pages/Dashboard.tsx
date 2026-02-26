import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  User,
  CreditCard,
  Users,
  Wallet,
  Send,
  X,
  WifiOff,
  RefreshCw,
  Share2,
} from "@/lib/icons";
import { sendExternalInvitation } from "@/lib/api";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import MobileHeader from "@/components/MobileHeader";
import AppContainer from "@/components/AppContainer";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import InvitationsList from "@/components/InvitationsList";
import AddMoneySheet from "@/components/AddMoneySheet";
import PaymentConfirmationSheet from "@/components/PaymentConfirmationSheet";
import PWAInstallButton from "@/components/PWAInstallButton";
import NotificationIcon from "@/components/NotificationIcon";
import OnboardingTour from "@/components/OnboardingTour";
import PageGuide from "@/components/PageGuide";
import ShareButton from "@/components/ShareButton";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import UsernameMigration from "@/components/UsernameMigration";
import { TransactionList } from "@/components/TransactionList";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import {
  useFirebaseData,
  type Transaction,
} from "@/contexts/FirebaseDataContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useSync } from "@/hooks/useSync";
import { useOneSignalPush } from "@/hooks/useOneSignalPush";
import { usePendingGroupJoin } from "@/hooks/usePendingGroupJoin";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
    addMoneyToWallet,
    payMyDebt,
    getAllTransactions,
    addMemberToGroup,
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
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [initialGroupIdForSheet, setInitialGroupIdForSheet] = useState("");
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

  // Notification prompt state
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);

  // Tooltip states for mobile
  const [showBalanceTooltip, setShowBalanceTooltip] = useState(false);
  const [showSettlementsTooltip, setShowSettlementsTooltip] = useState(false);
  const [showDeltaTooltip, setShowDeltaTooltip] = useState(false);

  // Check if we should show onboarding or guides
  useEffect(() => {
    if (shouldShowOnboarding()) {
      setShowOnboarding(true);
    } else if (shouldShowPageGuide("dashboard")) {
      setShowDashboardGuide(true);
    }
  }, [shouldShowOnboarding, shouldShowPageGuide]);

  // One-time post-login guidance
  useEffect(() => {
    const shouldShowRefreshTip = sessionStorage.getItem("showPostLoginRefreshTip");
    if (shouldShowRefreshTip === "1") {
      toast.info(t('common.tip'), {
        description: "Please refresh once after login to access the app smoothly.", // Keeping English technical tip as requested by app logic sometimes, but could localize if needed. 
      });
      sessionStorage.removeItem("showPostLoginRefreshTip");
    }
  }, []);

  // Show notification prompt when app is first installed
  useEffect(() => {
    const checkNotificationPrompt = () => {
      // Check if we should show notification prompt
      const hasSeenPrompt = localStorage.getItem("hasSeenNotificationPrompt");

      if (
        isInstalled &&
        notificationsSupported &&
        notificationPermission === "default" &&
        !hasSeenPrompt &&
        !showOnboarding // Don't show during onboarding
      ) {
        // Wait a bit for better UX
        setTimeout(() => {
          setShowNotificationPrompt(true);
        }, 3000);
      }
    };

    checkNotificationPrompt();
  }, [
    isInstalled,
    notificationsSupported,
    notificationPermission,
    showOnboarding,
  ]);

  // Handle notification prompt actions
  const handleEnableNotifications = async () => {
    setIsEnablingNotifications(true);
    try {
      const success = await subscribeToPush();
      if (success) {
        setShowNotificationPrompt(false);
        localStorage.setItem("hasSeenNotificationPrompt", "true");
        toast.success(t('settings.push_enabled'));
      }
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  const handleDismissNotificationPrompt = () => {
    setShowNotificationPrompt(false);
    localStorage.setItem("hasSeenNotificationPrompt", "true");
  };

  // Onboarding steps
  const onboardingSteps = [
    {
      id: "welcome",
      title: t('dashboard.onboarding.welcome_title'),
      description: t('dashboard.onboarding.welcome_desc'),
      emoji: "👋",
    },
    {
      id: "wallet",
      title: t('dashboard.onboarding.wallet_title'),
      description: t('dashboard.onboarding.wallet_desc'),
      emoji: "💳",
    },
    {
      id: "settlements",
      title: t('dashboard.onboarding.settlements_title'),
      description: t('dashboard.onboarding.settlements_desc'),
      emoji: "⚖️",
    },
    {
      id: "actions",
      title: t('dashboard.onboarding.actions_title'),
      description: t('dashboard.onboarding.actions_desc'),
      emoji: "🚀",
    },
    {
      id: "ready",
      title: t('dashboard.onboarding.ready_title'),
      description: t('dashboard.onboarding.ready_desc'),
      emoji: "🎯",
    },
  ];

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    markOnboardingComplete();
    toast.success(t('dashboard.onboarding.ready_title'));
  };

  const handleDashboardGuideClose = () => {
    setShowDashboardGuide(false);
    markPageGuideShown("dashboard");
  };

  // Get all transactions including wallet transactions
  const allTransactions = getAllTransactions();

  // Calculate time since last transaction
  const lastTransactionTime = useMemo(() => {
    if (allTransactions.length === 0) return t('dashboard.no_tx_yet');

    const lastTransaction = allTransactions[0]; // Most recent transaction
    const lastTransactionTime = new Date(
      lastTransaction.timestamp || lastTransaction.date,
    ).getTime();
    const now = new Date().getTime();
    const diffInMinutes = Math.floor((now - lastTransactionTime) / (1000 * 60));

    if (diffInMinutes < 1) return t('dashboard.updated_now');
    if (diffInMinutes === 1) return t('dashboard.updated_min');
    if (diffInMinutes < 60) return t('dashboard.updated_mins', { count: diffInMinutes });

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return t('dashboard.updated_hour');
    if (diffInHours < 24) return t('dashboard.updated_hours', { count: diffInHours });

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return t('dashboard.updated_day');
    return t('dashboard.updated_days', { count: diffInDays });
  }, [allTransactions, t]);

  const dashboardHighlights = useMemo(() => {
    return [
      {
        label: t('dashboard.groups'),
        value: groups.length,
      },
      {
        label: t('dashboard.transactions'),
        value: allTransactions.length,
      },
      {
        label: offline ? t('dashboard.offline_queue') : t('dashboard.sync_queue'),
        value: pendingCount,
      },
    ];
  }, [groups.length, allTransactions.length, offline, pendingCount]);

  // Group transactions by date (Today, Yesterday, Older)
  const { todayTransactions, yesterdayTransactions, olderTransactions } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayTransactions: Transaction[] = [];
    const yesterdayTransactions: Transaction[] = [];
    const olderTransactions: Transaction[] = [];

    allTransactions.forEach((transaction) => {
      const transactionDate = new Date(
        transaction.timestamp || transaction.date,
      );
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
  }, [allTransactions]);

  // Calculate totals using new settlement system
  const walletBalance = getWalletBalance();
  const settlementDelta = getSettlementDelta();
  const totalToReceive = getTotalToReceive();
  const totalToPay = getTotalToPay();

  const pendingPaymentCounts = useMemo(() => {
    const settlementsByGroup = user?.settlements || {};
    const entries = Object.values(settlementsByGroup).flatMap(
      (groupSettlements) => Object.values(groupSettlements || {}),
    );

    const toPayCount = entries.filter((item) => (item?.toPay || 0) > 0).length;
    const toReceiveCount = entries.filter(
      (item) => (item?.toReceive || 0) > 0,
    ).length;

    return {
      total: toPayCount + toReceiveCount,
      toPayCount,
      toReceiveCount,
    };
  }, [user?.settlements]);

  // Calculate percentage change for after settlements
  const afterSettlementsBalance = walletBalance + settlementDelta;

  // Persist day-to-day settlement delta
  useEffect(() => {
    if (user?.uid) {
      const today = new Date().toISOString().split("T")[0];
      const todayKey = `settlementDelta_${user.uid}_${today}`;
      localStorage.setItem(todayKey, settlementDelta.toString());
    }
  }, [user?.uid, settlementDelta]);

  // Calculate day-to-day change for Settlement Delta using localStorage
  const dayToDay = useMemo(() => {
    if (!user?.uid) return { change: 0, direction: "same" };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split("T")[0];
    const yesterdayStorageKey = `settlementDelta_${user.uid}_${yesterdayKey}`;

    // Get yesterday's settlement delta
    const yesterdaySettlementDelta = parseFloat(
      localStorage.getItem(yesterdayStorageKey) || "0",
    );

    if (yesterdaySettlementDelta === 0 && settlementDelta === 0) {
      return { change: 0, direction: "same" };
    }

    if (yesterdaySettlementDelta === 0) {
      return {
        change: Math.abs(settlementDelta),
        direction: settlementDelta > 0 ? "up" : "down",
        isFirstDay: true,
      };
    }

    const absoluteChange = Math.abs(settlementDelta - yesterdaySettlementDelta);
    const percentChange =
      (absoluteChange / Math.abs(yesterdaySettlementDelta)) * 100;

    return {
      change: percentChange,
      direction:
        settlementDelta > yesterdaySettlementDelta
          ? "up"
          : settlementDelta < yesterdaySettlementDelta
            ? "down"
            : "same",
      absoluteChange: absoluteChange,
      isFirstDay: false,
    };
  }, [user?.uid, settlementDelta]);

  // Prepare groups data for sheets
  const groupsForSheets = useMemo(() => {
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      isPersonal: (g as any).isPersonal,
      createdBy: (g as any).createdBy,
      members: g.members.map((m) => ({
        id: m.id,
        name: m.name,
        isTemporary: m.isTemporary,
        deletionCondition: (m as any).deletionCondition,
        expiresAt: (m as any).expiresAt,
        type: (m as any).type,
        userId: (m as any).userId,
      })),
    }));
  }, [groups]);

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === "add") {
      if (groups.length === 0) {
        toast.error(t('group.group_not_found'), { description: "Create a group first to add expenses" });
        navigate("/create-group");
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
      navigate("/create-group");
    } else {
      setInitialGroupIdForSheet("");
      setShowAddExpense(true);
    }
  };

  const handlePersonalExpense = () => {
    const personalGroup = groups.find((g) => (g as any).isPersonal);
    if (personalGroup) {
      setInitialGroupIdForSheet(personalGroup.id);
      setShowAddExpense(true);
    } else {
      // Fallback if no personal group found (shouldn't happen with migration logic)
      handleAddExpense();
    }
  };

  const handleReceivedMoney = () => {
    if (offline) {
      toast.error(t('common.offline'), {
        description: "This feature needs an active connection",
        icon: "📴",
      });
      return;
    }
    if (groups.length === 0) {
      toast.error("Create a group first to record payments");
      navigate("/create-group");
    } else if (totalToReceive <= 0) {
      toast.error(
        "No pending payments to record. Nobody owes you money right now.",
      );
    } else {
      setShowRecordPayment(true);
    }
  };

  const handleNewGroup = () => {
    if (offline) {
      toast.error(t('common.offline'), {
        description: "This feature needs an active connection",
        icon: "📴",
      });
      return;
    }
    navigate("/create-group");
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
      // Members are now added immediately in AddExpenseSheet, so no need for staging replacements here
      const result = await addExpense({
        groupId: data.groupId,
        amount: data.amount,
        paidBy: data.paidBy,
        participants: data.participants,
        note: data.note,
        place: data.place,
      });

      if (result.success) {
        toast.success(t('common.success'), { description: `Added expense of ${formatAmount(data.amount)}` });
        if (result.transaction) {
          navigate("/receipt", { state: { transaction: result.transaction, type: "expense" } });
        }
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
        const memberName = group?.members.find(
          (m) => m.id === data.fromMember,
        )?.name;
        toast.success(
          t('common.success'), { description: `Recorded ${formatAmount(data.amount)} from ${memberName}` }
        );
        if (result.transaction) {
          navigate("/receipt", { state: { transaction: result.transaction, type: "payment" } });
        }
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
    members: {
      name: string;
      phone?: string;
      paymentDetails?: {
        jazzCash?: string;
        easypaisa?: string;
        bankName?: string;
        accountNumber?: string;
        raastId?: string;
      };
    }[];
    coverPhoto?: string;
    invitedUsernames?: string[];
    invitedEmails?: string[];
  }) => {
    const groupData: any = {
      name: data.name,
      emoji: data.emoji,
      members: data.members.map((m) => ({
        name: m.name,
        phone: m.phone,
        paymentDetails: m.paymentDetails,
      })),
      invitedUsernames: data.invitedUsernames || [], // Pass the invites!
    };

    // Only add coverPhoto if it exists (Firebase doesn't allow undefined)
    if (data.coverPhoto) {
      groupData.coverPhoto = data.coverPhoto;
    }

    const result = await createGroup(groupData);

    if (result.success) {
      toast.success(t('common.success'), { description: `Created group "${data.name}"` });

      // Handle Email Invites (External)
      if (
        data.invitedEmails &&
        data.invitedEmails.length > 0 &&
        result.groupId
      ) {
        data.invitedEmails.forEach((email) => {
          sendExternalInvitation(result.groupId!, email)
            .then(() => toast.success(t('common.success'), { description: `Invitation sent to ${email}` }))
            .catch((err) => console.error("Failed to send email invite", err));
        });
      }
    } else {
      toast.error(result.error || "Failed to create group");
    }
  };

  const handleAddMoney = async (amount: number, note?: string) => {
    const result = await addMoneyToWallet(amount, note);
    if (result.success) {
      toast.success(t('common.success'), { description: `Added ${formatAmount(amount)} to wallet` });
      if (result.transaction) {
        navigate("/receipt", { state: { transaction: result.transaction, type: "wallet_add" } });
      }
    } else {
      toast.error(result.error || "Failed to add money");
    }
  };

  const handlePaymentConfirmation = async (
    memberId: string,
    amount: number,
  ) => {
    // Find the group and member
    let targetGroup = null;
    let targetMember = null;

    for (const group of groups) {
      const member = group.members.find((m) => m.id === memberId);
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
      toast.success(t('common.success'), { description: `Paid ${formatAmount(amount)} to ${targetMember.name}` });
    } else {
      toast.error(result.error || "Payment failed");
    }
    return result;
  };

  // Get greeting based on time with emoji
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: t('dashboard.greeting_morning'), emoji: "" };
    if (hour < 17) return { text: t('dashboard.greeting_afternoon'), emoji: "☀️" };
    return { text: t('dashboard.greeting_evening'), emoji: "🌙" };
  };

  const greeting = getGreeting();

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar />

      <AppContainer>
        {/* Desktop Header */}
        <DesktopHeader />

        {/* Mobile Header */}
        <MobileHeader />
        {/* Username Migration Prompt */}
        <UsernameMigration />

        <main className="flex-1 w-full max-w-5xl mx-auto p-4 lg:p-6 space-y-6 pb-24 lg:pb-8">
          {/* Invitations List - Shows only when there are pending invitations */}
          <div className="mt-20 lg:mt-24 mb-[-2rem]">
            <InvitationsList />
          </div>

          {/* Greeting Section - Moved further down with more spacing */}
          <section className="mt-16 lg:mt-20 mb-10 lg:mb-12">
            <p className="text-gray-500 font-semibold text-sm">{t('dashboard.welcome_back')}</p>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-gray-900">
              {user?.name || "User"}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {t('dashboard.groups')}
                </span>
                <span className="text-xs font-black text-slate-800 tabular-nums">
                  {groups.length}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600">
                  {t('dashboard.pending_payments')}
                </span>
                <span className="text-xs font-black text-emerald-700 tabular-nums">
                  {pendingPaymentCounts.total}
                </span>
                <span className="text-[10px] font-bold text-emerald-600/80">
                  ({t('dashboard.pay_receive', { pay: pendingPaymentCounts.toPayCount, receive: pendingPaymentCounts.toReceiveCount })})
                </span>
              </div>
            </div>
          </section>

          {/* Notification Prompt Card - First Time Install */}
          {showNotificationPrompt && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-5 shadow-lg animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-2xl">🔔</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-blue-900 text-base mb-1.5 tracking-tight">
                    {t('dashboard.notification_prompt_title')}
                  </h3>
                  <p className="text-sm text-blue-700 font-medium leading-relaxed mb-4">
                    {t('dashboard.notification_prompt_desc')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEnableNotifications}
                      disabled={isEnablingNotifications}
                      className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 text-sm"
                    >
                      {isEnablingNotifications
                        ? t('common.loading')
                        : t('common.enable_notifications')}
                    </button>
                    <button
                      onClick={handleDismissNotificationPrompt}
                      disabled={isEnablingNotifications}
                      className="px-4 h-10 border-2 border-blue-300 text-blue-700 hover:bg-blue-100 font-black rounded-2xl transition-all disabled:opacity-50 text-sm"
                    >
                      {t('common.later')}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleDismissNotificationPrompt}
                  disabled={isEnablingNotifications}
                  className="w-8 h-8 rounded-full hover:bg-blue-200 flex items-center justify-center transition-colors flex-shrink-0"
                  aria-label="Dismiss notification prompt"
                >
                  <X className="w-4 h-4 text-blue-700" />
                </button>
              </div>
            </div>
          )}

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
                      {t('dashboard.available_balance')}
                      <span className="w-4 h-4 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[10px] active:bg-white/30 active:scale-95 transition-all">
                        ?
                      </span>
                    </button>
                    {showBalanceTooltip && (
                      <div
                        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowBalanceTooltip(false)}
                      >
                        <div
                          className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center flex-shrink-0 shadow-lg">
                              <span className="text-xl">💰</span>
                            </div>
                            <div>
                              <h4 className="font-black text-sm mb-1.5 text-gray-900">
                                {t('dashboard.available_balance')}
                              </h4>
                              <p className="text-xs leading-relaxed text-gray-600 font-medium">
                                {t('dashboard.available_balance_desc', "Your current wallet balance that you can spend right now. This doesn't include pending settlements.")}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowBalanceTooltip(false)}
                            className="mt-4 w-full py-2 bg-[#4a6850] text-white rounded-xl font-bold text-sm"
                          >
                            {t('common.got_it', 'Got it')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button className="text-white/70 text-xs font-black uppercase tracking-wider cursor-help inline-flex items-center gap-1.5 hover:text-white/90 transition-colors">
                          {t('dashboard.available_balance')}
                          <span className="w-4 h-4 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[10px] hover:bg-white/25 hover:scale-110 transition-all">
                            ?
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-xl">💰</span>
                          </div>
                          <div>
                            <h4 className="font-black text-sm mb-1.5 text-gray-900">
                              {t('dashboard.available_balance')}
                            </h4>
                            <p className="text-xs leading-relaxed text-gray-600 font-medium">
                              {t('dashboard.available_balance_desc')}
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <h3 className="text-3xl lg:text-4xl font-black mt-1 tracking-tighter text-white tabular-nums">
                    {formatAmount(walletBalance)}
                  </h3>
                  {/* Last transaction time - smaller on mobile */}
                  <p className="text-white/40 text-[10px] lg:text-xs mt-1.5 lg:mt-2 font-semibold">
                    {lastTransactionTime}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddMoney(true)}
                  className="glass p-2.5 lg:p-3 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                  aria-label="Add money to wallet"
                >
                  <Plus className="w-4 lg:w-5 h-4 lg:h-5 text-white" />
                </button>
              </div>

              <div
                className="mt-6 lg:mt-8 p-4 lg:p-5 flex justify-between items-center gap-4"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderRadius: "2rem",
                  boxShadow: "inset 0 0 0 2px rgba(255, 255, 255, 0.2)",
                }}
              >
                <div className="flex-1 min-w-0">
                  {/* Mobile: Click to toggle, Desktop: Hover */}
                  <div className="lg:hidden">
                    <button
                      onClick={() =>
                        setShowSettlementsTooltip(!showSettlementsTooltip)
                      }
                      className="text-white/60 text-[9px] uppercase font-black mb-1 inline-flex items-center gap-1 active:text-white transition-colors"
                    >
                      {t('dashboard.after_settlements')}
                      <span className="w-3.5 h-3.5 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[8px] active:bg-white/30 active:scale-95 transition-all">
                        ?
                      </span>
                    </button>
                    {showSettlementsTooltip && (
                      <div
                        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowSettlementsTooltip(false)}
                      >
                        <div
                          className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                              <span className="text-xl">📊</span>
                            </div>
                            <div>
                              <h4 className="font-black text-sm mb-1.5 text-gray-900">
                                {t('dashboard.after_settlements')}
                              </h4>
                              <p className="text-xs leading-relaxed text-gray-600 font-medium">
                                {t('dashboard.after_settlements_desc')}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowSettlementsTooltip(false)}
                            className="mt-4 w-full py-2 bg-[#4a6850] text-white rounded-xl font-bold text-sm"
                          >
                            {t('common.got_it')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button className="text-white/60 text-[10px] uppercase font-black mb-1 cursor-help inline-flex items-center gap-1 hover:text-white/80 transition-colors">
                          {t('dashboard.after_settlements')}
                          <span className="w-3.5 h-3.5 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[8px] hover:bg-white/25 hover:scale-110 transition-all">
                            ?
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-xl">📊</span>
                          </div>
                          <div>
                            <h4 className="font-black text-sm mb-1.5 text-gray-900">
                              {t('dashboard.after_settlements')}
                            </h4>
                            <p className="text-xs leading-relaxed text-gray-600 font-medium">
                              {t('dashboard.after_settlements_desc')}
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-base lg:text-lg font-black text-white tabular-nums truncate tracking-tight">
                    Rs {afterSettlementsBalance.toLocaleString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 min-w-0">
                  {/* Mobile: Click to toggle, Desktop: Hover */}
                  <div className="lg:hidden">
                    <button
                      onClick={() => setShowDeltaTooltip(!showDeltaTooltip)}
                      className="text-white/60 text-[9px] uppercase font-black mb-1 truncate inline-flex items-center gap-1 active:text-white transition-colors"
                    >
                      {t('dashboard.settlement_delta')}
                      <span className="w-3.5 h-3.5 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[8px] active:bg-white/30 active:scale-95 transition-all">
                        ?
                      </span>
                    </button>
                    {showDeltaTooltip && (
                      <div
                        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDeltaTooltip(false)}
                      >
                        <div
                          className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                              <span className="text-xl">📈</span>
                            </div>
                            <div>
                              <h4 className="font-black text-sm mb-1.5 text-gray-900">
                                {t('dashboard.settlement_delta')}
                              </h4>
                              <p className="text-xs leading-relaxed text-gray-600 font-medium">
                                {t('dashboard.settlement_delta_desc')}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowDeltaTooltip(false)}
                            className="mt-4 w-full py-2 bg-[#4a6850] text-white rounded-xl font-bold text-sm"
                          >
                            {t('common.got_it')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button className="text-white/60 text-[10px] uppercase font-black mb-1 truncate cursor-help inline-flex items-center gap-1 hover:text-white/80 transition-colors">
                          {t('dashboard.settlement_delta')}
                          <span className="w-3.5 h-3.5 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-[8px] hover:bg-white/25 hover:scale-110 transition-all">
                            ?
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-xl">📈</span>
                          </div>
                          <div>
                            <h4 className="font-black text-sm mb-1.5 text-gray-900">
                              {t('dashboard.settlement_delta')}
                            </h4>
                            <p className="text-xs leading-relaxed text-gray-600 font-medium">
                              {t('dashboard.settlement_delta_desc')}
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div
                    className={`flex items-center justify-end ${settlementDelta > 0 ? "text-emerald-300" : "text-rose-300"}`}
                  >
                    {dayToDay.direction !== "same" && (
                      <span className="text-xs lg:text-sm mr-1 flex-shrink-0">
                        {dayToDay.direction === "up" ? "▲" : "▼"}
                      </span>
                    )}
                    <span className="font-black text-sm lg:text-base tabular-nums truncate tracking-tight">
                      {settlementDelta > 0 ? "+" : ""}
                      {settlementDelta < 0 ? "-" : ""}Rs{" "}
                      {Math.abs(settlementDelta).toLocaleString()}
                    </span>
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
                    <ArrowDownLeft
                      className="w-5 h-5 text-[#4a6850]"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>

                <p className="text-[11px] font-bold text-[#4a6850]/70 mb-1.5 tracking-wide">
                  {t('dashboard.total_to_receive')}
                </p>
                <h4 className="text-2xl font-black text-[#4a6850] tabular-nums tracking-tight mb-2">
                  Rs {totalToReceive.toLocaleString()}
                </h4>

                <div className="flex items-center gap-1 text-[#4a6850] font-bold text-xs">
                  <span>{t('common.view_details')}</span>
                  <span className="text-base group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
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
                    <ArrowUpRight
                      className="w-5 h-5 text-rose-500"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>

                <p className="text-[11px] font-bold text-rose-500/70 mb-1.5 tracking-wide">
                  {t('dashboard.total_to_pay')}
                </p>
                <h4 className="text-2xl font-black text-rose-500 tabular-nums tracking-tight mb-2">
                  Rs {totalToPay.toLocaleString()}
                </h4>

                <div className="flex items-center gap-1 text-rose-500 font-bold text-xs">
                  <span>{t('sheets.record_payment.settle_now')}</span>
                  <span className="text-base group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
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
                        <ArrowDownLeft
                          className="w-7 h-7 text-[#4a6850]"
                          strokeWidth={2.5}
                        />
                      </div>
                    </div>

                    <p className="text-xs font-bold text-[#4a6850]/70 mb-2 tracking-wide">
                      {t('dashboard.total_to_receive')}
                    </p>
                    <h4 className="text-4xl font-black text-[#4a6850] tabular-nums tracking-tight mb-4">
                      Rs {totalToReceive.toLocaleString()}
                    </h4>

                    <div className="flex items-center gap-1.5 text-[#4a6850] font-bold text-sm">
                      <span>
                        {totalToReceive <= 0
                          ? t('to_receive.all_settled_up')
                          : t('common.view_details')}
                      </span>
                      {totalToReceive > 0 && (
                        <span className="text-lg group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-xl">💵</span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm mb-1.5 text-gray-900">
                      {t('to_receive.guide_title')}
                    </h4>
                    <p className="text-xs leading-relaxed text-gray-600 font-medium">
                      {t('to_receive.guide_desc')}
                    </p>
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
                        <ArrowUpRight
                          className="w-7 h-7 text-rose-500"
                          strokeWidth={2.5}
                        />
                      </div>
                    </div>

                    <p className="text-xs font-bold text-rose-500/70 mb-2 tracking-wide">
                      {t('dashboard.total_to_pay')}
                    </p>
                    <h4 className="text-4xl font-black text-rose-500 tabular-nums tracking-tight mb-4">
                      Rs {totalToPay.toLocaleString()}
                    </h4>

                    <div className="flex items-center gap-1.5 text-rose-500 font-bold text-sm">
                      <span>{t('sheets.record_payment.settle_now')}</span>
                      <span className="text-lg group-hover:translate-x-1 transition-transform">
                        →
                      </span>
                    </div>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-gradient-to-br from-white to-gray-50 text-gray-900 border-2 border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-xs rounded-3xl p-5 backdrop-blur-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-xl">💳</span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm mb-1.5 text-gray-900">
                      {t('to_pay.guide_title')}
                    </h4>
                    <p className="text-xs leading-relaxed text-gray-600 font-medium">
                      {t('to_pay.guide_desc')}
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </section>

          {/* Quick Actions */}
          {/* Mobile Version - Original Icon Grid */}
          <section className="lg:hidden mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Quick Actions
              </h3>
              <button
                onClick={() => navigate("/groups")}
                className="text-xs font-black text-primary dark:text-emerald-400"
              >
                {t('dashboard.quick_actions.open_groups')}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={handlePersonalExpense}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/50 active:scale-95 transition-all shadow-sm"
              >
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Plus className="w-6 h-6 font-bold" />
                </div>
                <span className="text-xs font-black text-emerald-900 dark:text-emerald-100 text-center">
                  {t('dashboard.quick_actions.log_solo')}
                </span>
              </button>

              <button
                onClick={handleAddExpense}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white text-center">
                  {t('dashboard.quick_actions.split_bill')}
                </span>
              </button>

              <button
                onClick={handleNewGroup}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white text-center">
                  {t('dashboard.quick_actions.new_group')}
                </span>
              </button>

              <button
                onClick={() => navigate("/personal-space")}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white text-center">
                  {t('dashboard.quick_actions.send')}
                </span>
              </button>

              <button
                onClick={handleReceivedMoney}
                disabled={totalToReceive <= 0}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all ${totalToReceive <= 0 ? "opacity-50" : ""}`}
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white text-center">
                  {t('dashboard.quick_actions.received')}
                </span>
              </button>

              <button
                onClick={() => setShowAddMoney(true)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white text-center">
                  {t('dashboard.quick_actions.top_up')}
                </span>
              </button>
            </div>
          </section>

          {/* Desktop Version - Enhanced Large Cards */}
          <section className="hidden lg:block">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Quick Actions
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {/* Personal Expense - NEW ACTION */}
              <button
                onClick={handlePersonalExpense}
                className="group cursor-pointer bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-emerald-400/50 hover:shadow-xl hover:shadow-emerald-900/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-left relative overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Plus className="w-8 h-8 font-bold" />
                  </div>
                  <h5 className="text-xl font-black mb-2 tracking-tighter">
                    {t('dashboard.quick_actions.log_solo')}
                  </h5>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
                    {t('dashboard.quick_actions.log_solo_desc')}
                  </p>
                </div>
              </button>

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
                  <h5 className="text-xl font-black mb-2 tracking-tighter text-emerald-900 dark:text-emerald-100">
                    {t('dashboard.quick_actions.split_bill')}
                  </h5>
                  <p className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                    {t('dashboard.quick_actions.split_bill_desc')}
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate("/personal-space")}
                className="group cursor-pointer bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-blue-400/50 hover:shadow-xl hover:shadow-blue-900/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-left relative overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Send className="w-8 h-8 font-bold" />
                  </div>
                  <h5 className="text-xl font-black mb-2 tracking-tighter">
                    {t('dashboard.quick_actions.send_money')}
                  </h5>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
                    {t('dashboard.quick_actions.send_money_desc')}
                  </p>
                </div>
              </button>

              <button
                onClick={handleReceivedMoney}
                disabled={totalToReceive <= 0}
                className={`group cursor-pointer bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-slate-400/50 hover:shadow-xl hover:shadow-slate-900/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-left ${totalToReceive <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Send className="w-8 h-8" />
                </div>
                <h5 className="text-xl font-black mb-2 tracking-tighter">
                  {t('dashboard.quick_actions.received')}
                </h5>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
                  {totalToReceive <= 0
                    ? t('dashboard.quick_actions.no_settlements')
                    : t('dashboard.quick_actions.received_desc')}
                </p>
              </button>

              <button
                onClick={handleNewGroup}
                className="group cursor-pointer bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-left"
              >
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8" />
                </div>
                <h5 className="text-xl font-black mb-2 tracking-tighter">
                  {t('dashboard.quick_actions.new_group')}
                </h5>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
                  {t('dashboard.quick_actions.new_group_desc')}
                </p>
              </button>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="mt-8 lg:mt-12">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="px-6 py-4 lg:px-8 lg:py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-black tracking-tighter text-sm lg:text-base">
                  {t('dashboard.recent_activity')}
                </h3>
                {allTransactions.length > 3 && (
                  <button
                    onClick={() => navigate("/activity")}
                    className="text-xs lg:text-sm font-black text-primary dark:text-emerald-400 hover:underline"
                  >
                    {t('dashboard.view_all')}
                  </button>
                )}
              </div>

              {allTransactions.length > 0 ? (
                <div className="p-3 lg:p-4">
                  <TransactionList
                    title={t('common.today')}
                    transactions={todayTransactions.slice(0, 3)}
                    groups={groups}
                    userId={user?.uid}
                    onSelectTransaction={setSelectedTransaction}
                    formatAmount={formatAmount}
                  />
                  <TransactionList
                    title={t('common.yesterday')}
                    transactions={yesterdayTransactions.slice(0, 2)}
                    groups={groups}
                    userId={user?.uid}
                    onSelectTransaction={setSelectedTransaction}
                    formatAmount={formatAmount}
                    showSeparator
                  />
                  {todayTransactions.length + yesterdayTransactions.length < 3 && (
                    <TransactionList
                      title="Older"
                      transactions={olderTransactions.slice(
                        0,
                        3 - todayTransactions.length - yesterdayTransactions.length
                      )}
                      groups={groups}
                      userId={user?.uid}
                      onSelectTransaction={setSelectedTransaction}
                      formatAmount={formatAmount}
                      showSeparator
                      dateFormat="date"
                    />
                  )}
                </div>
              ) : (
                <div className="p-8 lg:p-12 text-center">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-[#4a6850]/20 to-[#5a7860]/20 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <span className="text-xl lg:text-2xl">💸</span>
                  </div>
                  <h3 className="text-sm lg:text-lg font-black text-gray-900 dark:text-white mb-1 lg:mb-2 tracking-tight">
                    Ready to get started?
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4 lg:mb-6 text-xs lg:text-sm">
                    Your financial journey begins here! 🚀
                  </p>
                  <button
                    onClick={
                      groups.length === 0 ? handleNewGroup : handleAddExpense
                    }
                    className="py-2 px-4 lg:py-3 lg:px-6 bg-gradient-to-r from-[#4a6850] to-[#5a7860] text-white font-bold text-sm lg:text-base rounded-xl lg:rounded-2xl hover:from-[#3d5643] hover:to-[#4a6850] hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {groups.length === 0
                      ? "Create Your First Group"
                      : "Add Your First Expense"}
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
            groups={groups}
            user={user}
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
            "Check recent activity to track all transactions",
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
            onClose={() => {
              setShowAddExpense(false);
              setInitialGroupIdForSheet("");
            }}
            groups={groupsForSheets}
            initialGroupId={initialGroupIdForSheet}
            onSubmit={handleExpenseSubmit}
            onAddMember={async (groupId, data) => {
              const result = await addMemberToGroup(groupId, data);
              if (result.success) {
                toast.success(`Added temporary member: ${data.name}`);
              } else {
                toast.error(result.error || "Failed to add member");
              }
              return result;
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
      </AppContainer >
    </>
  );
};

export default Dashboard;
