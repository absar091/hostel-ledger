import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowDownLeft, Plus, User, CreditCard, Users, Wallet, Send, X } from "@/lib/icons";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
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
import Tooltip from "@/components/Tooltip";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, getWalletBalance, getTotalToReceive, getTotalToPay, getSettlementDelta } = useFirebaseAuth();
  const { groups, createGroup, addExpense, recordPayment, addMoneyToWallet, payMyDebt, getAllTransactions } = useFirebaseData();
  const { isInstalled } = usePWAInstall();
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

  // Check if we should show onboarding or guides
  useEffect(() => {
    if (shouldShowOnboarding()) {
      setShowOnboarding(true);
    } else if (shouldShowPageGuide('dashboard')) {
      setShowDashboardGuide(true);
    }
  }, [shouldShowOnboarding, shouldShowPageGuide]);

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
    if (groups.length === 0) {
      toast.error("Create a group first to record payments");
      setShowCreateGroup(true);
    } else if (totalToReceive <= 0) {
      toast.error("No pending payments to record. Nobody owes you money right now.");
    } else {
      setShowRecordPayment(true);
    }
  };
  
  const handleNewGroup = () => setShowCreateGroup(true);

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
    if (hour < 12) return { text: "Good morning", emoji:"" };
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
          <div className="flex items-center justify-between p-6 border-b border-[#4a6850]/10 bg-gradient-to-r from-[#4a6850]/5 to-[#3d5643]/5 flex-shrink-0">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={`w-12 h-12 rounded-3xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                transaction.type === 'expense' ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' : 
                transaction.type === 'payment' ? 'bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white' : 'bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white'
              }`}>
                {transaction.type === 'expense' ? (
                  <ArrowUpRight className="w-6 h-6 font-bold" />
                ) : transaction.type === 'payment' ? (
                  <ArrowDownLeft className="w-6 h-6 font-bold" />
                ) : (
                  <CreditCard className="w-6 h-6 font-bold" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-black text-gray-900 text-lg tracking-tight truncate">Transaction Details</h2>
                <p className="text-sm text-[#4a6850]/80 capitalize font-bold truncate">{transaction.type}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95 flex-shrink-0 ml-4"
            >
              <X className="w-5 h-5 text-white font-bold" strokeWidth={3} />
            </button>
          </div>

          {/* Scrollable content - iPhone Style */}
          <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            <div className="p-6">
              {/* Transaction header - iPhone Style */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{transaction.title}</h3>
                <div className="text-5xl font-black text-gray-900 mb-2 tracking-tighter tabular-nums">
                  Rs {transaction.amount.toLocaleString()}
                </div>
                <div className="text-sm text-[#4a6850]/80 font-bold">
                  {transaction.date}
                  {transaction.timestamp && ` • ${new Date(transaction.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                </div>
              </div>

              <div className="space-y-4">
                {/* Group Information - iPhone Style */}
                {transactionGroup && (
                  <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <Users className="w-6 h-6 text-[#4a6850] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#4a6850]/80 font-black uppercase tracking-wide">Group</div>
                      <div className="font-black text-gray-900 truncate text-lg tracking-tight">{transactionGroup.name}</div>
                      <div className="text-sm text-[#4a6850]/80 font-bold">{transactionGroup.members.length} members</div>
                    </div>
                  </div>
                )}

                {/* Paid By (for expenses) - iPhone Style */}
                {transaction.paidByName && (
                  <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <User className="w-6 h-6 text-[#4a6850] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#4a6850]/80 font-black uppercase tracking-wide">Paid by</div>
                      <div className="font-black text-gray-900 truncate text-lg tracking-tight">{transaction.paidByName}</div>
                    </div>
                  </div>
                )}

                {/* Payment Details (for payments) - iPhone Style */}
                {transaction.fromName && transaction.toName && (
                  <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <ArrowUpRight className="w-6 h-6 text-[#4a6850] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#4a6850]/80 font-black uppercase tracking-wide">Payment</div>
                      <div className="font-black text-gray-900 truncate text-lg tracking-tight">{transaction.fromName} → {transaction.toName}</div>
                      {transaction.method && (
                        <div className="text-sm text-[#4a6850]/80 capitalize font-bold">via {transaction.method}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Participants (for expenses) - iPhone Style */}
                {transaction.participants && transaction.participants.length > 0 && (
                  <div className="p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <div className="text-sm text-[#4a6850]/80 mb-4 font-black uppercase tracking-wide">Participants ({transaction.participants.length})</div>
                    <div className="space-y-3 max-h-32 overflow-y-auto">
                      {transaction.participants.map((participant: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="font-black text-gray-900 truncate flex-1 mr-3 tracking-tight">{participant.name}</span>
                          <span className="text-sm text-[#4a6850] flex-shrink-0 font-black tabular-nums">Rs {participant.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Place (for expenses) - iPhone Style */}
                {transaction.place && (
                  <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <div className="w-6 h-6 rounded-full bg-[#4a6850]/20 flex-shrink-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#4a6850]"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#4a6850]/80 font-black uppercase tracking-wide">Place</div>
                      <div className="font-black text-gray-900 truncate text-lg tracking-tight">{transaction.place}</div>
                    </div>
                  </div>
                )}

                {/* Note - iPhone Style */}
                {transaction.note && (
                  <div className="p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl border border-[#4a6850]/20 shadow-lg">
                    <div className="text-sm text-[#4a6850]/80 mb-3 font-black uppercase tracking-wide">Note</div>
                    <div className="font-bold text-gray-900 break-words leading-relaxed">{transaction.note}</div>
                  </div>
                )}

                {/* Wallet Balance Changes (for wallet transactions) - iPhone Style */}
                {(transaction.walletBalanceBefore !== undefined || transaction.walletBalanceAfter !== undefined) && (
                  <div className="space-y-4">
                    {transaction.walletBalanceBefore !== undefined && (
                      <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200 shadow-lg">
                        <CreditCard className="w-6 h-6 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-500 font-black uppercase tracking-wide">Wallet Balance Before</div>
                          <div className="font-black text-gray-900 text-lg tracking-tight tabular-nums">Rs {transaction.walletBalanceBefore.toLocaleString()}</div>
                        </div>
                      </div>
                    )}
                    
                    {transaction.walletBalanceAfter !== undefined && (
                      <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl border border-[#4a6850]/20 shadow-lg">
                        <CreditCard className="w-6 h-6 text-[#4a6850] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[#4a6850]/80 font-black uppercase tracking-wide">Wallet Balance After</div>
                          <div className="font-black text-gray-900 text-lg tracking-tight tabular-nums">Rs {transaction.walletBalanceAfter.toLocaleString()}</div>
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
    <div className="min-h-screen bg-[#F8F9FA] pb-24 safe-area-pt relative">
      {/* Header - Minimalist Style */}
      <header className="sticky top-0 z-30 bg-[#F8F9FA]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#4a6850] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#4a6850]/20">
            <img
              src="/only-logo.png"
              alt="Hostel Ledger"
              className="w-5 h-5 object-contain filter brightness-0 invert"
            />
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-widest text-gray-500">Hostel Ledger</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
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

      <main className="px-6 space-y-8">
        {/* Greeting Section */}
        <section className="mt-4">
          <p className="text-gray-500 font-medium">Welcome back,</p>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">{user?.name || "User"}</h2>
        </section>
        {/* PRIMARY CARD: Exact copy from reference HTML */}
        <section className="mesh-gradient rounded-3xl p-6 text-white shadow-2xl shadow-[#4a6850]/30 relative">
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Available Balance</p>
                <h3 className="text-4xl font-bold mt-1 tracking-tight text-white">Rs {walletBalance.toLocaleString()}</h3>
              </div>
              <button 
                onClick={() => setShowAddMoney(true)}
                className="glass p-3 rounded-2xl flex items-center justify-center"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="mt-8 p-4 flex justify-between items-center" style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(12px)', 
              WebkitBackdropFilter: 'blur(12px)', 
              borderRadius: '2rem',
              boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.2)'
            }}>
              <div>
                <p className="text-white/60 text-[10px] uppercase font-bold">After settlements</p>
                <p className="text-lg font-semibold text-white">Rs {afterSettlementsBalance.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-[10px] uppercase font-bold">Settlement Delta</p>
                <div className={`flex items-center justify-end ${settlementDelta > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {dayToDay.direction !== 'same' && (
                    <span className="text-sm mr-1">
                      {dayToDay.direction === 'up' ? '▲' : '▼'}
                    </span>
                  )}
                  <span className="font-bold">{settlementDelta > 0 ? '+' : ''}-Rs {Math.abs(settlementDelta).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECONDARY CARDS: Minimalist Style */}
        <section className="grid grid-cols-2 gap-4">
          {/* To Receive Card */}
          <button 
            onClick={() => navigate("/to-receive")}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="w-8 h-8 rounded-lg bg-[#4a6850]/20 text-[#4a6850] flex items-center justify-center mb-3">
              <ArrowDownLeft className="w-[18px] h-[18px]" />
            </div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">To Receive</p>
            <p className="text-2xl font-black text-gray-800 mt-0.5 tabular-nums tracking-tight">Rs {totalToReceive.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-1 flex items-center font-medium">
              {totalToReceive <= 0 ? (
                <>All clear <span className="ml-1">✨</span></>
              ) : (
                'Tap to view'
              )}
            </p>
          </button>
          
          {/* You Owe Card */}
          <button 
            onClick={() => navigate("/to-pay")}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <ArrowUpRight className="w-[18px] h-[18px]" />
            </div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">You Owe</p>
            <p className="text-2xl font-black text-rose-600 mt-0.5 tabular-nums tracking-tight">Rs {totalToPay.toLocaleString()}</p>
            <button className="text-[10px] font-bold text-rose-500 mt-1 underline decoration-rose-200 underline-offset-2">
              Tap to settle
            </button>
          </button>
        </section>

        {/* Quick Actions - Minimalist Horizontal Scroll */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Quick Actions</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-6 px-6">
            <button
              onClick={handleAddExpense}
              className="flex-shrink-0 flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[#4a6850] transition-all active:scale-95 group-hover:bg-[#4a6850] group-hover:text-white">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-gray-600">Split Bill</span>
            </button>
            
            <button
              onClick={handleNewGroup}
              className="flex-shrink-0 flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[#4a6850] transition-all active:scale-95 group-hover:bg-[#4a6850] group-hover:text-white">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-gray-600">New Group</span>
            </button>
            
            <button
              onClick={handleReceivedMoney}
              disabled={totalToReceive <= 0}
              className={`flex-shrink-0 flex flex-col items-center gap-2 group ${totalToReceive <= 0 ? 'opacity-50' : ''}`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center transition-all active:scale-95 ${
                totalToReceive <= 0 
                  ? 'text-gray-400' 
                  : 'text-[#4a6850] group-hover:bg-[#4a6850] group-hover:text-white'
              }`}>
                <Send className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-gray-600">Received</span>
            </button>
            
            <button
              onClick={() => setShowAddMoney(true)}
              className="flex-shrink-0 flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[#4a6850] transition-all active:scale-95 group-hover:bg-[#4a6850] group-hover:text-white">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black text-gray-600">Top Up</span>
            </button>
          </div>
        </section>

        {/* Recent Activity - Minimalist Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Recent Activity</h3>
            {allTransactions.length > 3 && (
              <button 
                onClick={() => navigate("/activity")}
                className="text-xs font-black text-[#4a6850]"
              >
                View All
              </button>
            )}
          </div>
          
          {allTransactions.length > 0 ? (
            <div className="space-y-3">
              {allTransactions.slice(0, 3).map((transaction) => (
                <button
                  key={transaction.id}
                  onClick={() => setSelectedTransaction(transaction)}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100 transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                      {transaction.type === 'expense' ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : transaction.type === 'payment' ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <CreditCard className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-gray-800 text-sm tracking-tight">{transaction.title}</p>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {transaction.date}
                        {transaction.timestamp && ` • ${new Date(transaction.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm tracking-tight ${
                      transaction.type === 'expense' ? 'text-rose-500' : 'text-[#4a6850]'
                    }`}>
                      {transaction.type === 'expense' ? '-' : '+'}Rs {transaction.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      {transaction.type === 'expense' ? 'You Owe' : 'Paid'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-[#4a6850]/20 to-[#5a7860]/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2 tracking-tight">Ready to get started?</h3>
              <p className="text-gray-500 mb-6 text-sm">Your financial journey begins here! 🚀</p>
              <button
                onClick={groups.length === 0 ? handleNewGroup : handleAddExpense}
                className="py-3 px-6 bg-gradient-to-r from-[#4a6850] to-[#5a7860] text-white font-black rounded-2xl hover:from-[#3d5643] hover:to-[#4a6850] hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {groups.length === 0 ? "🎉 Create Your First Group" : "Add Your First Expense"}
              </button>
            </div>
          )}
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
    </div>
  );
};

export default Dashboard;
