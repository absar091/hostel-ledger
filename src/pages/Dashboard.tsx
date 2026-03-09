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
  ChevronRight,
  ArrowRight,
  Sparkles,
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
import AIInsightsSheet from "@/components/AIInsightsSheet";
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
  const [defaultAiMode, setDefaultAiMode] = useState(false);
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

  // Handle Deep Linking / App Shortcuts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const isPersonalAction = params.get('personal') === 'true';
    const groupIdParam = params.get('groupId');

    if (action === 'ai-entry' && user) {
      setDefaultAiMode(true);
      if (isPersonalAction) {
        const personalGroup = groups.find(g => (g as any).isPersonal);
        if (personalGroup) {
          setInitialGroupIdForSheet(personalGroup.id);
          setShowAddExpense(true);
          // Set to AI mode after a small delay to ensure sheet is ready
          setTimeout(() => {
            // We'll need a way to communicate "Start in AI Mode" to the sheet
            // I'll update AddExpenseSheet to accept a 'defaultAiMode' prop
          }, 100);
        }
      } else if (groupIdParam) {
        setInitialGroupIdForSheet(groupIdParam);
        setShowAddExpense(true);
      } else if (groups.length > 0) {
        // Default to first non-personal group or first group
        const targetGroup = groups.find(g => !(g as any).isPersonal) || groups[0];
        setInitialGroupIdForSheet(targetGroup.id);
        setShowAddExpense(true);
      }

      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, [user, groups]);

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
    payers?: { id: string; amount: number }[];
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
        payers: data.payers,
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

        {/* Standardized Mobile Header */}
        <MobileHeader />

        {/* Username Migration Prompt */}
        <UsernameMigration />

        <main className="flex-1 w-full max-w-5xl mx-auto p-4 lg:p-6 space-y-6 pb-24 lg:pb-12">
          {/* Greeting Section */}
          <section className="mt-4 mb-2 animate-fadeIn">
            <p className="text-muted-foreground font-semibold text-xs tracking-wide uppercase">{greeting.text} {greeting.emoji}</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground -mt-1">
              {user?.name?.split(' ')[0] || "User"}!
            </h2>
          </section>

          {/* Invitations List - Shows only when there are pending invitations */}
          <InvitationsList />

          {/* MAIN FINANCIAL SECTION: Wallet & Settlements */}
          <section className="space-y-4">
            {/* Wallet Balance Card (Emerald Gradient) */}
            <div className="wallet-card relative overflow-hidden group shadow-premium rounded-[20px] animate-in zoom-in-95 duration-300 ease-out">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                    {t('dashboard.available_balance')}
                  </p>
                  <h3 className="text-[34px] font-bold tracking-[-0.5px] text-white tabular-nums leading-none">
                    {formatAmount(walletBalance)}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddMoney(true)}
                  className="w-12 h-12 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center border border-white/20 backdrop-blur-md"
                >
                  <Plus className="w-6 h-6 text-white" strokeWidth={3} />
                </button>
              </div>
              <p className="text-white/30 text-[9px] mt-2 font-bold uppercase tracking-widest relative z-10">
                {lastTransactionTime}
              </p>
            </div>

            {/* Settlements Section - Vertical Stack with Dividers */}
            <div className="glass-card shadow-premium p-0 overflow-hidden">
              <div className="flex flex-col divide-y divide-border/50">
                {/* To Receive Row */}
                <button
                  onClick={() => navigate("/to-receive")}
                  className="p-5 flex items-center justify-between bg-[#E7F6F1] hover:brightness-[0.98] active:scale-[0.99] transition-all group"
                >
                  <div className="flex flex-col items-start gap-0.5 text-left">
                    <p className="text-[10px] font-black text-[#1a3a2e]/60 uppercase tracking-widest leading-none">{t('dashboard.total_to_receive')}</p>
                    <p className="text-[20px] font-bold text-[#1a3a2e] tabular-nums leading-tight">+{formatAmount(totalToReceive)}</p>
                    <p className="text-[9px] font-bold text-[#1a3a2e]/40 uppercase tracking-tighter mt-1">{t('to_receive.tap_to_view')}</p>
                  </div>
                  <ArrowDownLeft className="w-6 h-6 text-[#1a3a2e]/40 group-hover:text-[#1a3a2e] transition-colors" />
                </button>

                {/* To Pay Row */}
                <button
                  onClick={() => navigate("/to-pay")}
                  className="p-5 flex items-center justify-between bg-[#FEF1F2] hover:brightness-[0.98] active:scale-[0.99] transition-all group"
                >
                  <div className="flex flex-col items-start gap-0.5 text-left">
                    <p className="text-[10px] font-black text-[#991b1b]/60 uppercase tracking-widest leading-none">{t('dashboard.total_to_pay')}</p>
                    <p className="text-[20px] font-bold text-[#991b1b] tabular-nums leading-tight">-{formatAmount(totalToPay)}</p>
                    <p className="text-[9px] font-bold text-[#991b1b]/40 uppercase tracking-tighter mt-1">{t('to_pay.tap_to_view')}</p>
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-[#991b1b]/40 group-hover:text-[#991b1b] transition-colors" />
                </button>

                {/* Settlement Delta Highlight */}
                <div className="p-5 bg-slate-50/50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{t('dashboard.after_settlements')}</p>
                      <p className="text-[24px] font-bold text-gray-900 tabular-nums tracking-[-0.5px] leading-tight">{formatAmount(afterSettlementsBalance)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter opacity-70">Settlement Delta</p>
                      <div className={cn(
                        "flex items-center gap-1.5 text-[14px] font-black uppercase tracking-tight",
                        settlementDelta > 0 ? "text-[#1a3a2e]" : settlementDelta < 0 ? "text-[#991b1b]" : "text-gray-500"
                      )}>
                        {settlementDelta > 0 ? <ArrowDownLeft className="w-4 h-4" strokeWidth={3} /> : settlementDelta < 0 ? <ArrowUpRight className="w-4 h-4" strokeWidth={3} /> : null}
                        {formatAmount(Math.abs(settlementDelta))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 6 QUICK SHORTCUTS GRID */}
          <section className="animate-slideUp delay-100">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
              Quick Shortcuts
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {/* 1. Log (Split Bill) */}
              <button onClick={handleAddExpense} className="glass-card hover-lift p-4 flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-all shadow-sm">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-tight whitespace-nowrap">{t('dashboard.split_bill')}</span>
              </button>

              {/* 2. Solo (Personal Expense) */}
              <button onClick={handlePersonalExpense} className="glass-card hover-lift p-4 flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-[#DBEAFE] text-blue-600 flex items-center justify-center group-hover:scale-110 transition-all shadow-sm">
                  <User className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-tight whitespace-nowrap">{t('dashboard.log_solo')}</span>
              </button>

              {/* 3. Received (Record Payment) */}
              <button onClick={handleReceivedMoney} className="glass-card hover-lift p-4 flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-all shadow-sm">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-tight whitespace-nowrap">{t('dashboard.received')}</span>
              </button>

              {/* 4. Send (Record Payment TO) */}
              <button onClick={() => navigate("/send-money")} className="glass-card hover-lift p-4 flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] text-rose-600 flex items-center justify-center group-hover:scale-110 transition-all shadow-sm">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-tight whitespace-nowrap">{t('dashboard.send_money')}</span>
              </button>

              {/* 5. Add Money (Top up Wallet) */}
              <button onClick={() => setShowAddMoney(true)} className="glass-card hover-lift p-4 flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-amber-600 flex items-center justify-center group-hover:scale-110 transition-all shadow-sm">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-tight whitespace-nowrap">{t('dashboard.add_money')}</span>
              </button>

              {/* 6. AI Insights */}
              <AIInsightsSheet
                trigger={
                  <button className="w-full glass-card hover-lift p-4 flex flex-col items-center gap-2 group">
                    <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-teal-600 flex items-center justify-center group-hover:scale-110 transition-all shadow-sm">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-tight whitespace-nowrap">{t('dashboard.ai_insights')}</span>
                  </button>
                }
              />
            </div>
          </section>

          {/* ACTIVE GROUPS CAROUSEL */}
          <section className="animate-slideUp delay-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Active Groups
              </h3>
              <button onClick={() => navigate("/groups")} className="text-[10px] font-black text-emerald-600 uppercase">
                {t('dashboard.view_all')}
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4 snap-x">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/group/${group.id}`)}
                  className="flex-shrink-0 w-32 glass-card p-4 flex flex-col items-center text-center gap-2 snap-center hover-lift"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-2xl shadow-sm border border-emerald-100">
                    {group.emoji || "🏠"}
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-[11px] font-black text-foreground truncate uppercase tracking-tighter">{group.name}</p>
                    <p className="text-[9px] font-bold text-muted-foreground mt-0.5">{group.members.length} members</p>
                  </div>
                </button>
              ))}
              <button
                onClick={handleNewGroup}
                className="flex-shrink-0 w-32 glass-card border-dashed border-2 border-emerald-200/50 bg-emerald-50/10 p-4 flex flex-col items-center justify-center text-center gap-2 snap-center hover:bg-emerald-50 transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <Plus className="w-6 h-6 text-emerald-500" />
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-tighter">{t('dashboard.quick_actions.new_group')}</span>
              </button>
            </div>
          </section>

          {/* RECENT ACTIVITY FEED */}
          <section className="animate-slideUp delay-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {t('dashboard.recent_activity')}
              </h3>
              {allTransactions.length > 5 && (
                <button onClick={() => navigate("/activity")} className="text-[10px] font-black text-emerald-600 uppercase">
                  {t('dashboard.view_all_dashboard')}
                </button>
              )}
            </div>
            <div className="glass-card shadow-sm divide-y divide-border/30 overflow-hidden">
              {allTransactions.length > 0 ? (
                <div className="p-1">
                  <TransactionList
                    transactions={allTransactions.slice(0, 5)}
                    groups={groups}
                    userId={user?.uid}
                    onSelectTransaction={setSelectedTransaction}
                    formatAmount={formatAmount}
                  />
                  {allTransactions.length > 5 && (
                    <button
                      onClick={() => navigate("/activity")}
                      className="w-full py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 transition-colors"
                    >
                      {t('dashboard.view_all_dashboard')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-black text-foreground mb-1 tracking-tight">Financial journey starts here!</h4>
                  <p className="text-[11px] font-medium text-muted-foreground mb-6 max-w-[200px]">Add your first expense or payment to track your hostel life.</p>
                  <button onClick={handleAddExpense} className="btn-primary-teal text-xs w-full max-w-[180px]">
                    Create First Transaction
                  </button>
                </div>
              )}
            </div>
          </section>
        </main >

        {/* Transaction Detail Modal */}
        {
          selectedTransaction && (
            <TransactionDetailModal
              transaction={selectedTransaction}
              onClose={() => setSelectedTransaction(null)}
              groups={groups}
              user={user}
            />
          )
        }

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
        {
          groups.length > 0 && (
            <AddExpenseSheet
              open={showAddExpense}
              onClose={() => {
                setShowAddExpense(false);
                setInitialGroupIdForSheet("");
                setDefaultAiMode(false);
              }}
              groups={groupsForSheets}
              initialGroupId={initialGroupIdForSheet}
              defaultAiMode={defaultAiMode}
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
          )
        }

        {
          groups.length > 0 && (
            <RecordPaymentSheet
              open={showRecordPayment}
              onClose={() => setShowRecordPayment(false)}
              groups={groupsForSheets}
              onSubmit={handlePaymentSubmit}
            />
          )
        }

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
