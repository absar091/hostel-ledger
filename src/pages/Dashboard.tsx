import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowDownLeft, Plus, User, CreditCard, Users } from "@/lib/icons";
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
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-3xl flex items-center justify-center shadow-lg ${
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
              <div>
                <h2 className="font-black text-gray-900 text-lg tracking-tight">Transaction Details</h2>
                <p className="text-sm text-[#4a6850]/80 capitalize font-bold">{transaction.type}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
            >
              <span className="text-gray-600 text-xl font-bold">×</span>
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
                <div className="text-sm text-[#4a6850]/80 font-bold">{transaction.date}</div>
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
    <div className="min-h-screen bg-white pb-20 safe-area-pt relative">
      {/* iPhone-style top accent border - Enhanced */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>
      
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
            <ShareButton variant="icon" />
            {isInstalled ? <NotificationIcon /> : <PWAInstallButton />}
          </div>
        </div>
      </div>

      {/* Profile Greeting Section - iPhone Style Enhanced with Fixed Alignment */}
      <div className="px-4 pt-12 pb-8">
        <div className="flex items-center gap-4">
          {/* Enhanced Profile Avatar with iPhone-style shadow */}
          <div className="relative flex-shrink-0">
            <Avatar 
              name={user?.name || "User"} 
              photoURL={user?.photoURL} 
              size="lg" 
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl leading-none">{greeting.emoji}</span>
              <div className="text-sm font-black text-[#4a6850]/80 tracking-wide uppercase">{greeting.text}</div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 leading-tight tracking-tight">
              {user?.name ? `${user.name.split(' ')[0]}!` : "Welcome!"}
            </h2>
          </div>
        </div>
      </div>

      {/* Dashboard Cards - Production-Grade Fintech UI */}
      <div className="mobile-padding pt-2">
        {/* Section Label */}
        <div className="mb-6">
          <h2 className="text-lg font-black text-gray-900 tracking-tight opacity-60 uppercase text-xs">Overview</h2>
        </div>

        {/* PRIMARY CARD: Available Balance - Glass Design */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:shadow-[0_25px_70px_rgba(0,0,0,0.12)] transition-all duration-300 mb-8 relative border border-white/50 max-w-lg mx-auto backdrop-saturate-150">
          {/* Glass effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-white/20 rounded-3xl pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black tracking-widest uppercase text-gray-700">Available Balance</span>
                <Tooltip 
                  content="This is the actual money in your wallet that you can spend right now. It doesn't include money others owe you."
                  position="bottom"
                >
                  <div className="w-4 h-4 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center cursor-help hover:bg-white/90 transition-colors shadow-sm">
                    <span className="text-[10px] font-black text-gray-600">?</span>
                  </div>
                </Tooltip>
              </div>
              <button 
                onClick={() => setShowAddMoney(true)}
                className="bg-[#4a6850]/90 hover:bg-[#3d5643] text-white w-11 h-11 rounded-2xl cursor-pointer active:scale-95 transition-all flex items-center justify-center shadow-lg hover:shadow-xl backdrop-blur-sm"
              >
                <Plus className="w-5 h-5 font-black" />
              </button>
            </div>
            
            {/* Small horizontal divider after label */}
            <div className="w-20 h-px bg-gray-300 mb-4"></div>
            
            {/* Main Balance Number */}
            <div className="text-4xl font-black tracking-tighter leading-none mb-3 text-gray-900 tabular-nums">
              Rs {walletBalance.toLocaleString()}
            </div>
            
            {/* Settlement Information */}
            <div className="pt-3 border-t border-white/60">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-sm text-gray-700 font-bold">
                  After settlements: <span className="tabular-nums font-black text-gray-900">Rs {(walletBalance + settlementDelta).toLocaleString()}</span>
                </div>
                <Tooltip 
                  content="This shows what your wallet balance will be after all pending group settlements are completed."
                  position="top"
                >
                  <div className="w-4 h-4 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center cursor-help hover:bg-white/90 transition-colors shadow-sm">
                    <span className="text-[9px] font-black text-gray-600">?</span>
                  </div>
                </Tooltip>
              </div>
              
              {/* Settlement Delta - Simple Text Only */}
              {settlementDelta !== 0 && (
                <>
                  {/* Small horizontal divider */}
                  <div className="w-16 h-px bg-gray-300 my-3"></div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600 font-bold">
                      Settlement Delta: <span className={`tabular-nums font-black ${
                        settlementDelta > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {settlementDelta > 0 ? '+' : '−'}Rs {Math.abs(settlementDelta).toLocaleString()} <span className="font-black text-lg">{settlementDelta > 0 ? '↑' : '↓'}</span>
                      </span>
                    </div>
                    <Tooltip 
                      content={`This shows the net change to your wallet after all group settlements. ${settlementDelta > 0 ? 'You will receive this amount.' : 'You will pay this amount.'}`}
                      position="top"
                    >
                      <div className="w-4 h-4 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center cursor-help hover:bg-white/90 transition-colors shadow-sm">
                        <span className="text-[9px] font-black text-gray-600">?</span>
                      </div>
                    </Tooltip>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SECONDARY CARDS: Receive / Owe - Clean White Design */}
        <div className="grid grid-cols-2 gap-5 mb-10">
          {/* To Receive - White Background with Green Text */}
          <button 
            onClick={() => navigate("/to-receive")}
            className="bg-white border border-gray-100 rounded-3xl p-5 shadow-[0_15px_40px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-300 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-black tracking-wider uppercase text-gray-600">
                  TO RECEIVE
                </span>
              </div>
              {totalToReceive > 0 && (
                <ArrowDownLeft className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
              )}
            </div>
            <div className="text-3xl font-black tabular-nums mb-2 text-green-600">
              Rs {totalToReceive.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-gray-500">
              {totalToReceive <= 0 ? 'All settled up! 🎉' : 'View details'}
            </div>
          </button>
          
          {/* You Owe - White Background with Red/Orange Text */}
          <button 
            onClick={() => navigate("/to-pay")}
            className="bg-white border border-gray-100 rounded-3xl p-5 shadow-[0_15px_40px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-300 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs font-black tracking-wider uppercase text-gray-600">
                  YOU OWE
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
            </div>
            <div className="text-3xl font-black tabular-nums mb-2 text-red-600">
              Rs {totalToPay.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-gray-500">View details</div>
          </button>
        </div>

        {/* Section Label for Actions */}
        <div className="mb-6">
          <h2 className="text-lg font-black text-gray-900 tracking-tight opacity-60 uppercase text-xs">Quick Actions</h2>
        </div>

        {/* ACTION BUTTONS: Reduced Visual Weight - Flat, Utility Style */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button
            onClick={handleAddExpense}
            className="bg-gradient-to-br from-[#4a6850]/80 to-[#3d5643]/80 rounded-2xl p-4 hover:from-[#4a6850] hover:to-[#3d5643] hover:shadow-[0_8px_25px_rgba(74,104,80,0.2)] active:scale-[0.98] transition-all duration-200 text-center group shadow-[0_4px_15px_rgba(74,104,80,0.15)]"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 mx-auto group-hover:bg-white/30 group-hover:scale-105 transition-all duration-200">
              <Plus className="w-4 h-4 text-white font-bold" />
            </div>
            <div className="text-white font-black text-sm mb-1 leading-tight">Add Expense</div>
            <div className="text-xs text-white/80 font-bold leading-relaxed">Split a bill</div>
          </button>
          
          <button
            onClick={handleReceivedMoney}
            disabled={totalToReceive <= 0}
            className={`rounded-2xl p-4 active:scale-[0.98] transition-all duration-200 text-center group shadow-[0_4px_15px_rgba(0,0,0,0.1)] ${
              totalToReceive <= 0 
                ? 'bg-gradient-to-br from-gray-300/80 to-gray-400/80 cursor-not-allowed opacity-70' 
                : 'bg-gradient-to-br from-emerald-500/80 to-teal-500/80 hover:from-emerald-500 hover:to-teal-500 hover:shadow-[0_8px_25px_rgba(16,185,129,0.2)]'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 mx-auto transition-all duration-200 ${
              totalToReceive <= 0
                ? 'bg-white/20'
                : 'bg-white/20 group-hover:bg-white/30 group-hover:scale-105'
            }`}>
              <ArrowDownLeft className={`w-4 h-4 font-bold ${totalToReceive <= 0 ? 'text-white/70' : 'text-white'}`} />
            </div>
            <div className={`font-black text-sm mb-1 leading-tight ${totalToReceive <= 0 ? 'text-white/70' : 'text-white'}`}>
              Received
            </div>
            <div className={`text-xs font-bold leading-relaxed ${totalToReceive <= 0 ? 'text-white/60' : 'text-white/80'}`}>
              {totalToReceive <= 0 ? 'No pending' : 'Record payment'}
            </div>
          </button>
          
          <button
            onClick={handleNewGroup}
            className="bg-gradient-to-br from-blue-500/80 to-indigo-500/80 rounded-2xl p-4 hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_8px_25px_rgba(59,130,246,0.2)] active:scale-[0.98] transition-all duration-200 text-center group shadow-[0_4px_15px_rgba(59,130,246,0.15)]"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 mx-auto group-hover:bg-white/30 group-hover:scale-105 transition-all duration-200">
              <Users className="w-4 h-4 text-white font-bold" />
            </div>
            <div className="text-white font-black text-sm mb-1 leading-tight">New Group</div>
            <div className="text-xs text-white/80 font-bold leading-relaxed">Start sharing</div>
          </button>
        </div>

        {/* Recent Transactions - iPhone Style Enhanced with #4a6850 Theme */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">Recent Activity</h2>
            {allTransactions.length > 5 && (
              <button className="text-[#4a6850] text-sm font-black hover:text-[#3d5643] hover:bg-[#4a6850]/10 px-4 py-2 rounded-2xl transition-all duration-200 border border-[#4a6850]/20 shadow-sm hover:shadow-md">
                View All
              </button>
            )}
          </div>
          
          {allTransactions.length > 0 ? (
            <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(74,104,80,0.12)] overflow-hidden border border-[#4a6850]/10">
              {allTransactions.slice(0, 8).map((transaction, index) => (
                <button
                  key={transaction.id}
                  onClick={() => setSelectedTransaction(transaction)}
                  className="w-full p-5 flex items-center gap-4 hover:bg-[#4a6850]/5 active:bg-[#4a6850]/10 transition-all duration-200 border-b border-[#4a6850]/8 last:border-b-0 group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-lg ${
                    transaction.type === 'expense' ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' : 
                    transaction.type === 'payment' ? 'bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white' : 'bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white'
                  }`}>
                    {transaction.type === 'expense' ? (
                      <ArrowUpRight className="w-5 h-5 font-bold" />
                    ) : transaction.type === 'payment' ? (
                      <ArrowDownLeft className="w-5 h-5 font-bold" />
                    ) : (
                      <CreditCard className="w-5 h-5 font-bold" />
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-black text-gray-900 mb-1 leading-tight tracking-tight">{transaction.title}</div>
                    <div className="text-sm text-gray-600 leading-relaxed">
                      {(() => {
                        const transactionGroup = groups.find(g => g.id === transaction.groupId);
                        return (
                          <>
                            {transactionGroup && <span className="font-black text-[#4a6850]">{transactionGroup.name}</span>}
                            {transactionGroup && <span className="text-gray-400 font-bold"> • </span>}
                            <span className="text-gray-600 font-bold">{transaction.date}</span>
                            {transaction.type === "expense" && transaction.paidByName && (
                              <span className="text-gray-500 font-medium"> • Paid by {transaction.paidByName}</span>
                            )}
                            {transaction.type === "payment" && transaction.fromName && transaction.toName && (
                              <span className="text-gray-500 font-medium"> • {transaction.fromName} to {transaction.toName}</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-black tabular-nums leading-tight text-lg tracking-tight ${
                      transaction.type === 'expense' ? 'text-orange-600' : 
                      transaction.type === 'payment' ? 'text-[#4a6850]' : 'text-[#4a6850]'
                    }`}>
                      {transaction.type === 'expense' ? '-' : '+'}Rs {transaction.amount.toLocaleString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">Ready to get started?</h3>
              <p className="text-gray-500 mb-6 text-sm leading-relaxed">Your financial journey begins here! 🚀</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={groups.length === 0 ? handleNewGroup : handleAddExpense}
                  className="py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-2xl hover:from-emerald-600 hover:to-teal-600 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {groups.length === 0 ? "🎉 Create Your First Group" : "Add Your First Expense"}
                </button>
                <div className="text-xs text-gray-400 leading-relaxed">
                  {groups.length === 0 ? "Start by adding friends or roommates" : "Split your first bill with the group"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
