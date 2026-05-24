import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  User,
  CreditCard,
  Users,
  Send,
  X,
  WifiOff,
  RefreshCw,
  Share2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Info,
  Clock,
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
import PersonalBudgetSheet from "@/components/personal/PersonalBudgetSheet";
import { Progress } from "@/components/ui/progress";

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
    getTotalToReceive,
    getTotalToPay,
    getSettlementDelta,
  } = useFirebaseAuth();
  const {
    groups,
    createGroup,
    addExpense,
    recordPayment,
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
  const [showPersonalBudgetSheet, setShowPersonalBudgetSheet] = useState(false);

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
      id: "overview",
      title: "Your Overview",
      description: "See your total clear picture at a glance.",
      emoji: "📊",
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


  // Persist day-to-day settlement delta
  useEffect(() => {
    if (user?.uid) {
      // Use local date string (YYYY-MM-DD) for consistency across timezones
      const today = new Date().toLocaleDateString('en-CA');
      const todayKey = `settlementDelta_${user.uid}_${today}`;
      localStorage.setItem(todayKey, settlementDelta.toString());
    }
  }, [user?.uid, settlementDelta]);

  // Calculate day-to-day change for Settlement Delta using localStorage
  const dayToDay = useMemo(() => {
    if (!user?.uid) return { change: 0, direction: "same", isFirstDay: false };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toLocaleDateString('en-CA');
    const yesterdayStorageKey = `settlementDelta_${user.uid}_${yesterdayKey}`;

    // Get yesterday's settlement delta
    const yesterdayValue = localStorage.getItem(yesterdayStorageKey);
    const yesterdaySettlementDelta = parseFloat(yesterdayValue || "0");

    // If no previous data, mark as first day
    if (yesterdayValue === null || (yesterdaySettlementDelta === 0 && settlementDelta !== 0)) {
      return {
        change: 0,
        direction: settlementDelta > 0 ? "up" : settlementDelta < 0 ? "down" : "same",
        isFirstDay: true,
      };
    }

    if (yesterdaySettlementDelta === 0 && settlementDelta === 0) {
      return { change: 0, direction: "same", isFirstDay: false };
    }

    const absoluteChange = Math.abs(settlementDelta - yesterdaySettlementDelta);
    const percentChange = (absoluteChange / Math.abs(yesterdaySettlementDelta)) * 100;

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
    location?: { lat: number; lng: number };
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
        location: data.location,
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

        <main className="flex-1 w-full max-w-5xl mx-auto p-4 lg:p-6 space-y-6 pb-24 lg:pb-12" role="main" aria-label="Dashboard Content">
          {/* Greeting Section */}
          <section className="mt-4 mb-6 animate-fadeIn px-2" aria-label="Greeting">
            <p className="text-gray-500 font-medium text-sm tracking-wide mb-1">{greeting.text} {greeting.emoji}</p>
            <h2 className="text-[32px] font-black tracking-tight text-gray-900 leading-none">
              {user?.name?.split(' ')[0] || "User"}!
            </h2>
          </section>

          {/* Invitations List - Shows only when there are pending invitations */}
          <InvitationsList />

          {/* ═══════════════════════════════════════════════════════ */}
          {/* FINANCIAL OVERVIEW — Premium Dashboard Layout           */}
          {/* Order: Budget Hero → Settlement Delta → To Pay/Receive  */}
          {/* ═══════════════════════════════════════════════════════ */}
          <section className="space-y-4 px-2" aria-label="Financial Overview">
            
            {/* ── 1. PERSONAL BUDGET — Hero Card (Top) ── */}
            {user?.personalBudget && (user.personalBudget.amount || 0) > 0 && (() => {
              const budgetAmount = user.personalBudget.amount;
              const budgetSpent = user.personalBudget.spent || 0;
              const ratio = budgetSpent / budgetAmount;
              const pct = Math.min(Math.round(ratio * 100), 999);
              const remaining = Math.max(0, budgetAmount - budgetSpent);
              const over = ratio >= 1;
              const warn = ratio >= 0.8 && !over;
              
              return (
                <div className="relative overflow-hidden rounded-[2rem] shadow-[0_20px_60px_rgba(74,104,80,0.25)]" style={{ background: over ? 'linear-gradient(145deg, #7f1d1d 0%, #991b1b 60%, #b91c1c 100%)' : warn ? 'linear-gradient(145deg, #78350f 0%, #92400e 60%, #b45309 100%)' : 'linear-gradient(145deg, #2D5A47 0%, #1B4332 60%, #1a3a2e 100%)' }}>
                  {/* Glassmorphism orbs */}
                  <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />
                  <div className="absolute bottom-0 -left-8 w-36 h-36 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)' }} />

                  <div className="relative p-4 md:p-5 pb-5 md:pb-6">
                    {/* Top row: label + edit button */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/[0.12] flex items-center justify-center backdrop-blur-xl border border-white/[0.08]">
                          <Sparkles className="w-4 h-4 text-white/80" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Personal Budget</span>
                          <p className="text-[13px] font-bold text-white/70 capitalize leading-tight">{user.personalBudget.period} Limit</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowPersonalBudgetSheet(true)}
                        aria-label="Refresh personal budget"
                        className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center border border-white/[0.05] hover:bg-white/[0.15] transition-colors active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-white/40" />
                      </button>
                    </div>

                    {/* Spent amount — responsive */}
                    <div className="flex items-end justify-between mb-1">
                      <h4 className="font-black tracking-tight text-white tabular-nums leading-[1]" style={{ fontSize: 'clamp(20px, 4.5vw, 34px)' }}>
                        {formatAmount(budgetSpent)}
                      </h4>
                      <div className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-black border shrink-0 ml-3",
                        over ? "bg-white/15 border-white/10 text-white" : warn ? "bg-amber-400/15 border-amber-400/15 text-amber-200" : "bg-emerald-400/15 border-emerald-400/15 text-emerald-300"
                      )}>
                        {pct}% used
                      </div>
                    </div>
                    <p className="text-[12px] font-bold text-white/30 mb-4">of {formatAmount(budgetAmount)}</p>

                    {/* Progress bar */}
                    <div className="relative h-2 w-full bg-white/[0.08] rounded-full overflow-hidden mb-4">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-out",
                          over ? "bg-white/60" : warn ? "bg-amber-400/70" : "bg-emerald-400/50"
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    {/* Footer stats */}
                    <div className="flex justify-between items-center">
                      <p className="text-[12px] font-bold text-white/30">
                        <span className="text-white/70 font-black">{formatAmount(remaining)}</span> remaining
                      </p>
                      <p className="text-[10px] font-bold text-white/25 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 
                        Resets {user.personalBudget.period === 'daily' ? 'midnight' : user.personalBudget.period === 'weekly' ? 'weekly' : 'monthly'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* Budget CTA — only when no budget set (same top position) */}
            {(!user?.personalBudget || !(user.personalBudget.amount > 0)) && (
              <button 
                onClick={() => setShowPersonalBudgetSheet(true)}
                className="w-full bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-dashed border-[#4a6850]/15 p-5 flex items-center gap-4 group hover:border-[#4a6850]/30 transition-all active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#EAF5EF] text-[#4B6B54] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-black text-gray-900 tracking-tight leading-none mb-1">Set Personal Budget</p>
                  <p className="text-[11px] font-bold text-[#4a6850]/50">Track and control your daily spending</p>
                </div>
              </button>
            )}

            {/* ── 2. SETTLEMENT DELTA + TO RECEIVE + TO PAY — Card Group ── */}
            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/5 divide-y divide-[#4a6850]/5 overflow-hidden">
              
              {/* Settlement Delta — Compact row */}
              <div className="p-3.5 md:p-4 px-4 md:px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(145deg, #2D5A47 0%, #1B4332 100%)' }}>
                      <CreditCard className="w-4 h-4 text-white/80" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#4a6850]/50 uppercase tracking-[0.18em] mb-0.5">Settlement Delta</p>
                      <p className="font-black text-gray-900 tabular-nums tracking-tight leading-none" style={{ fontSize: 'clamp(16px, 3.5vw, 20px)' }}>
                        {settlementDelta > 0 ? "+" : settlementDelta < 0 ? "−" : ""}{formatAmount(Math.abs(settlementDelta))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {dayToDay.change !== 0 && (
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black",
                        dayToDay.isFirstDay 
                          ? "bg-blue-50 text-blue-500"
                          : dayToDay.direction === "up"
                            ? "bg-[#EAF5EF] text-[#4B6B54]"
                            : "bg-rose-50 text-rose-500"
                      )}>
                        {!dayToDay.isFirstDay && (dayToDay.direction === "up" ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownLeft className="w-2.5 h-2.5" />)}
                        {dayToDay.isFirstDay ? "NEW" : `${dayToDay.change > 0 && dayToDay.change < 1 ? dayToDay.change.toFixed(1) : Math.round(dayToDay.change)}%`}
                      </div>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button aria-label="Net balance information" className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center hover:bg-[#EAF5EF] transition-colors">
                          <Info className="w-3 h-3 text-gray-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Net balance: {settlementDelta > 0 ? "People owe you" : settlementDelta < 0 ? "You owe others" : "All settled up"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* To Receive */}
              <button
                onClick={() => navigate("/to-receive")}
                className="w-full flex items-center justify-between p-3.5 md:p-4 px-4 md:px-5 active:bg-[#4a6850]/[0.03] transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF5EF] flex items-center justify-center shadow-sm shrink-0">
                    <ArrowDownLeft className="w-4.5 h-4.5 text-[#4B6B54]" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-[#4a6850]/50 uppercase tracking-[0.18em] mb-0.5">{t('dashboard.total_to_receive')}</p>
                    <p className="font-black text-gray-900 tabular-nums tracking-tight leading-none truncate" style={{ fontSize: 'clamp(15px, 3.5vw, 18px)' }}>
                      +{formatAmount(totalToReceive)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] font-bold text-[#4a6850]/40 bg-[#EAF5EF] px-2 py-0.5 rounded-full">
                    {pendingPaymentCounts.toReceiveCount} {pendingPaymentCounts.toReceiveCount === 1 ? 'person' : 'people'}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#4a6850]/25" />
                </div>
              </button>

              {/* To Pay */}
              <button
                onClick={() => navigate("/to-pay")}
                className="w-full flex items-center justify-between p-3.5 md:p-4 px-4 md:px-5 active:bg-[#4a6850]/[0.03] transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shadow-sm shrink-0">
                    <ArrowUpRight className="w-4.5 h-4.5 text-rose-500" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-rose-400/70 uppercase tracking-[0.18em] mb-0.5">{t('dashboard.total_to_pay')}</p>
                    <p className="font-black text-gray-900 tabular-nums tracking-tight leading-none truncate" style={{ fontSize: 'clamp(15px, 3.5vw, 18px)' }}>
                      −{formatAmount(totalToPay)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] font-bold text-rose-400/50 bg-rose-50 px-2 py-0.5 rounded-full">
                    {pendingPaymentCounts.toPayCount} {pendingPaymentCounts.toPayCount === 1 ? 'person' : 'people'}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-300/40" />
                </div>
              </button>
            </div>
          </section>

          {/* QUICK SHORTCUTS GRID - Horizontally scrollable */}
          <section className="animate-slideUp delay-100 px-2 relative" aria-label="Quick Shortcuts">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                  Quick Shortcuts
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Info className="w-3 h-3 text-gray-400/60 hover:text-gray-500 cursor-help transition-colors" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Commonly used actions for quick access</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                Swipe for more <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            {/* Scrollable Container */}
            <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-2 px-2 snap-x">
              {/* 1. Log (Split Bill) */}
              <button onClick={handleAddExpense} className="flex-shrink-0 w-[30%] bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-[20px] p-3.5 md:p-4 flex flex-col items-center gap-3 snap-center active:scale-95 transition-all">
                <div className="w-12 h-12 rounded-[16px] bg-[#EAF5EF] text-[#4B6B54] flex items-center justify-center">
                  <CreditCard className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold text-gray-700 leading-tight whitespace-nowrap">{t('dashboard.split_bill')}</span>
              </button>

              {/* 2. Solo (Personal Expense) */}
              <button onClick={handlePersonalExpense} className="flex-shrink-0 w-[30%] bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-[20px] p-3.5 md:p-4 flex flex-col items-center gap-3 snap-center active:scale-95 transition-all">
                <div className="w-12 h-12 rounded-[16px] bg-[#EBF3FE] text-[#4285F4] flex items-center justify-center">
                  <User className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold text-gray-700 leading-tight whitespace-nowrap">{t('dashboard.log_solo')}</span>
              </button>

              {/* 3. Received (Record Payment) */}
              <button onClick={handleReceivedMoney} className="flex-shrink-0 w-[30%] bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-[20px] p-3.5 md:p-4 flex flex-col items-center gap-3 snap-center active:scale-95 transition-all">
                <div className="w-12 h-12 rounded-[16px] bg-[#EAF5EF] text-[#34A853] flex items-center justify-center">
                  <ArrowDownLeft className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold text-gray-700 leading-tight whitespace-nowrap">{t('dashboard.received')}</span>
              </button>

              {/* 4. New Group */}
              <button onClick={() => navigate("/create-group")} className="flex-shrink-0 w-[30%] bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-[20px] p-3.5 md:p-4 flex flex-col items-center gap-3 snap-center active:scale-95 transition-all">
                <div className="w-12 h-12 rounded-[16px] bg-[#F4F6F8] text-[#4A5568] flex items-center justify-center">
                  <Users className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold text-gray-700 leading-tight whitespace-nowrap">{t('dashboard.quick_actions.new_group')}</span>
              </button>

              {/* 5. Send Money (to personal-space) */}
              <button onClick={() => navigate("/personal-space")} className="flex-shrink-0 w-[30%] bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-[20px] p-3.5 md:p-4 flex flex-col items-center gap-3 snap-center active:scale-95 transition-all">
                <div className="w-12 h-12 rounded-[16px] bg-[#F4F0FE] text-[#8B5CF6] flex items-center justify-center">
                  <Send className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold text-gray-700 leading-tight whitespace-nowrap">{t('dashboard.send_money')}</span>
              </button>


              {/* 6. AI Insights */}
              <AIInsightsSheet
                trigger={
                  <button className="flex-shrink-0 w-24 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-[20px] p-3.5 md:p-4 flex flex-col items-center gap-3 snap-center active:scale-95 transition-all">
                    <div className="w-12 h-12 rounded-[16px] bg-[#E8F8F5] text-[#1ABC9C] flex items-center justify-center">
                      <Sparkles className="w-6 h-6" strokeWidth={2} />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 leading-tight whitespace-nowrap">{t('dashboard.ai_insights')}</span>
                  </button>
                }
              />
            </div>
          </section >

          {/* RECENT ACTIVITY FEED */}
          <section className="animate-slideUp delay-200 px-2 mt-4" aria-label="Recent Activity">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                  {t('dashboard.recent_activity')}
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Info className="w-3 h-3 text-gray-400/60 hover:text-gray-500 cursor-help transition-colors" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Recent transactions and payments involving you</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {allTransactions.length > 5 && (
                <button onClick={() => navigate("/activity")} className="text-[10px] font-black text-[#4B6B54] uppercase">
                  {t('dashboard.view_all_dashboard')}
                </button>
              )}
            </div>
            <div className="bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-[24px] divide-y divide-gray-50 overflow-hidden">
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
          </section >
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


        <PaymentConfirmationSheet
          open={showPaymentConfirmation}
          onClose={() => {
            setShowPaymentConfirmation(false);
            setSelectedMemberForPayment(null);
          }}
          member={selectedMemberForPayment}
          onConfirmPayment={handlePaymentConfirmation}
        />

        <PersonalBudgetSheet
          open={showPersonalBudgetSheet}
          onClose={() => setShowPersonalBudgetSheet(false)}
        />
      </AppContainer >
    </>
  );
};

export default Dashboard;
