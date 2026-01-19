import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowDownLeft, Plus, User, CreditCard, Users } from "lucide-react";
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
    if (hour < 12) return { text: "Good morning", emoji: "👋" };
    if (hour < 17) return { text: "Good afternoon", emoji: "☀️" };
    return { text: "Good evening", emoji: "🌙" };
  };

  const greeting = getGreeting();

  // Transaction detail modal component
  const TransactionDetailModal = ({ transaction, onClose }: { transaction: any; onClose: () => void }) => {
    if (!transaction) return null;

    // Find the group for this transaction
    const transactionGroup = groups.find(g => g.id === transaction.groupId);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border border-gray-200 mx-auto">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                transaction.type === 'expense' ? 'bg-red-100 text-red-600' : 
                transaction.type === 'payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {transaction.type === 'expense' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : transaction.type === 'payment' ? (
                  <ArrowDownLeft className="w-4 h-4" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Transaction Details</h2>
                <p className="text-xs text-gray-500 capitalize">{transaction.type}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-600 text-lg">×</span>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            <div className="p-6">
              {/* Transaction header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{transaction.title}</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  Rs {transaction.amount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">{transaction.date}</div>
              </div>

              <div className="space-y-4">
                {/* Group Information */}
                {transactionGroup && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <Users className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500">Group</div>
                      <div className="font-medium text-gray-900 truncate">{transactionGroup.name}</div>
                      <div className="text-xs text-gray-500">{transactionGroup.members.length} members</div>
                    </div>
                  </div>
                )}

                {/* Paid By (for expenses) */}
                {transaction.paidByName && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <User className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500">Paid by</div>
                      <div className="font-medium text-gray-900 truncate">{transaction.paidByName}</div>
                    </div>
                  </div>
                )}

                {/* Payment Details (for payments) */}
                {transaction.fromName && transaction.toName && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <ArrowUpRight className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500">Payment</div>
                      <div className="font-medium text-gray-900 truncate">{transaction.fromName} → {transaction.toName}</div>
                      {transaction.method && (
                        <div className="text-xs text-gray-500 capitalize">via {transaction.method}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Participants (for expenses) */}
                {transaction.participants && transaction.participants.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-sm text-gray-500 mb-3">Participants ({transaction.participants.length})</div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {transaction.participants.map((participant: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="font-medium text-gray-900 truncate flex-1 mr-2">{participant.name}</span>
                          <span className="text-sm text-gray-500 flex-shrink-0">Rs {participant.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Place (for expenses) */}
                {transaction.place && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-5 h-5 rounded-full bg-gray-300 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500">Place</div>
                      <div className="font-medium text-gray-900 truncate">{transaction.place}</div>
                    </div>
                  </div>
                )}

                {/* Note */}
                {transaction.note && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-sm text-gray-500 mb-2">Note</div>
                    <div className="font-medium text-gray-900 break-words">{transaction.note}</div>
                  </div>
                )}

                {/* Wallet Balance Changes (for wallet transactions) */}
                {(transaction.walletBalanceBefore !== undefined || transaction.walletBalanceAfter !== undefined) && (
                  <div className="space-y-3">
                    {transaction.walletBalanceBefore !== undefined && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <CreditCard className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-500">Wallet Balance Before</div>
                          <div className="font-medium text-gray-900">Rs {transaction.walletBalanceBefore.toLocaleString()}</div>
                        </div>
                      </div>
                    )}
                    
                    {transaction.walletBalanceAfter !== undefined && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <CreditCard className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-500">Wallet Balance After</div>
                          <div className="font-medium text-gray-900">Rs {transaction.walletBalanceAfter.toLocaleString()}</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Balance Change Summary */}
                    {transaction.walletBalanceBefore !== undefined && transaction.walletBalanceAfter !== undefined && (
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          transaction.walletBalanceAfter > transaction.walletBalanceBefore ? 'bg-emerald-500' : 'bg-red-500'
                        }`}>
                          <span className="text-xs text-white font-bold">
                            {transaction.walletBalanceAfter > transaction.walletBalanceBefore ? '+' : '-'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-500">Balance Change</div>
                          <div className={`font-bold ${
                            transaction.walletBalanceAfter > transaction.walletBalanceBefore ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {transaction.walletBalanceAfter > transaction.walletBalanceBefore ? '+' : ''}
                            Rs {Math.abs(transaction.walletBalanceAfter - transaction.walletBalanceBefore).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed footer with close button */}
          <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 pb-20 safe-area-pt relative">
      {/* Full-width top accent border */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 z-50"></div>
      
      {/* App Header - Clean and Professional */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100/50 pt-2 pb-3 px-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          {/* App Logo and Name */}
          <div className="flex items-center gap-3">
            <img
              src="/only-logo.png"
              alt="Hostel Ledger"
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Hostel Ledger</h1>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <ShareButton variant="icon" />
            {isInstalled ? <NotificationIcon /> : <PWAInstallButton />}
          </div>
        </div>
      </div>

      {/* Profile Greeting Section - Separate and Elegant */}
      <div className="px-2 pt-8 pb-10">
        <div className="flex items-center gap-4">
          {/* Profile Avatar */}
          <Avatar 
            name={user?.name || "User"} 
            photoURL={user?.photoURL} 
            size="lg" 
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{greeting.emoji}</span>
              <div className="text-sm font-medium text-gray-600">{greeting.text}</div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              {user?.name ? `${user.name.split(' ')[0]}!` : "Welcome!"}
            </h2>
          </div>
        </div>
      </div>

      {/* Dashboard Cards - Production-Grade Fintech UI */}
      <div className="mobile-padding pt-2">
        {/* Available Balance Card - Modern emerald/teal design */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-3xl p-6 shadow-[0_12px_40px_rgba(16,185,129,0.2)] animate-[slideUp_0.5s_ease_forwards] text-white hover:shadow-[0_16px_48px_rgba(16,185,129,0.25)] transition-all duration-300 mb-8 relative">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium tracking-wide uppercase text-white/90">Available Balance</span>
              <Tooltip 
                content="This is the actual money in your wallet that you can spend right now. It doesn't include money others owe you."
                position="bottom"
              >
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center cursor-help">
                  <span className="text-[10px] font-bold text-white">?</span>
                </div>
              </Tooltip>
            </div>
            <button 
              onClick={() => setShowAddMoney(true)}
              className="bg-white/20 border-0 text-white w-10 h-10 rounded-2xl text-2xl cursor-pointer hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="text-4xl font-bold tracking-tight leading-tight mb-3 text-white tabular-nums">
            Rs {walletBalance.toLocaleString()}
          </div>
          
          {/* Subtle After Settlements - Secondary Info */}
          <div className="pt-3 border-t border-white/20">
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/80">
                After settlements: <span className="tabular-nums font-medium text-white/90">Rs {(walletBalance + settlementDelta).toLocaleString()}</span>
              </div>
              <Tooltip 
                content="This shows what your wallet balance will be after all pending group settlements are completed."
                position="top"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center cursor-help">
                  <span className="text-[9px] font-bold text-white">?</span>
                </div>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Settlement Delta Card - Crisp, no blur */}
          <button 
            onClick={() => navigate("/groups")}
            className="w-full bg-white rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.1)] active:scale-[0.99] transition-all duration-300 text-left border border-gray-100"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  settlementDelta < 0 ? 'bg-orange-400' : 
                  settlementDelta > 0 ? 'bg-emerald-400' : 'bg-gray-400'
                }`}></div>
                <span className="text-xs font-medium tracking-wide uppercase text-gray-600">Settlement Delta</span>
              </div>
              <div className="flex items-center gap-2">
                {settlementDelta < 0 && <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded-full font-medium">Pending</span>}
                {settlementDelta > 0 && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">Incoming</span>}
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <div className={`text-3xl font-bold tracking-tight mb-2 tabular-nums ${
              settlementDelta < 0 ? 'text-orange-600' : settlementDelta > 0 ? 'text-emerald-600' : 'text-gray-900'
            }`}>
              Rs {settlementDelta > 0 ? '' : '−'}{Math.abs(settlementDelta).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Tap to view group details
            </div>
          </button>

          {/* Receive / Owe Split Cards - Crisp design */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate("/to-receive")}
              className={`border rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-all duration-300 text-left group ${
                totalToReceive <= 0 
                  ? 'bg-gray-50 border-gray-200 cursor-default' 
                  : 'bg-white border-gray-100 hover:shadow-[0_8px_32px_rgba(16,185,129,0.08)]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${totalToReceive <= 0 ? 'bg-gray-400' : 'bg-emerald-500'}`}></div>
                  <span className={`text-xs font-medium tracking-wide uppercase ${totalToReceive <= 0 ? 'text-gray-500' : 'text-gray-600'}`}>
                    To Receive
                  </span>
                </div>
                {totalToReceive > 0 && (
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400 group-hover:text-emerald-500 transition-colors" />
                )}
              </div>
              <div className={`text-2xl font-bold tabular-nums mb-1 ${totalToReceive <= 0 ? 'text-gray-500' : 'text-emerald-600'}`}>
                Rs {totalToReceive.toLocaleString()}
              </div>
              <div className={`text-[10px] ${totalToReceive <= 0 ? 'text-gray-400' : 'text-gray-500'}`}>
                {totalToReceive <= 0 ? 'All settled up! 🎉' : 'View details'}
              </div>
            </button>
            
            <button 
              onClick={() => navigate("/to-pay")}
              className="bg-white border border-gray-100 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(251,146,60,0.08)] active:scale-[0.99] transition-all duration-300 text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                  <span className="text-xs font-medium tracking-wide uppercase text-gray-600">You Owe</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-orange-400 group-hover:text-orange-500 transition-colors" />
              </div>
              <div className="text-2xl font-bold text-orange-600 tabular-nums mb-1">
                Rs {totalToPay.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500">View details</div>
            </button>
          </div>
        </div>

        {/* Quick Actions - Crisp, no blur effects */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <button
            onClick={handleAddExpense}
            className="bg-white rounded-3xl p-4 hover:bg-gray-50 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all duration-300 text-center group border border-gray-100"
          >
            <div className="w-11 h-11 bg-gray-50 rounded-2xl flex items-center justify-center mb-3 mx-auto group-hover:bg-gray-100 group-hover:scale-105 transition-all duration-200">
              <Plus className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-gray-900 font-semibold text-sm mb-1 leading-tight">Add Expense</div>
            <div className="text-[11px] text-gray-500 leading-relaxed">Split a bill</div>
          </button>
          
          <button
            onClick={handleReceivedMoney}
            disabled={totalToReceive <= 0}
            className={`rounded-3xl p-4 active:scale-[0.98] transition-all duration-300 text-center group border ${
              totalToReceive <= 0 
                ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60' 
                : 'bg-white border-gray-100 hover:bg-gray-50 hover:shadow-[0_8px_32px_rgba(16,185,129,0.1)]'
            }`}
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 mx-auto transition-all duration-200 shadow-sm ${
              totalToReceive <= 0
                ? 'bg-gray-200'
                : 'bg-gradient-to-br from-emerald-500 to-emerald-600 group-hover:from-emerald-600 group-hover:to-emerald-700 group-hover:scale-105'
            }`}>
              <ArrowDownLeft className={`w-5 h-5 ${totalToReceive <= 0 ? 'text-gray-400' : 'text-white'}`} />
            </div>
            <div className={`font-semibold text-sm mb-1 leading-tight ${totalToReceive <= 0 ? 'text-gray-500' : 'text-gray-900'}`}>
              Received
            </div>
            <div className={`text-[11px] leading-relaxed ${totalToReceive <= 0 ? 'text-gray-400' : 'text-gray-500'}`}>
              {totalToReceive <= 0 ? 'No pending payments' : 'Record payment'}
            </div>
          </button>
          
          <button
            onClick={handleNewGroup}
            className="bg-white rounded-3xl p-4 hover:bg-gray-50 hover:shadow-[0_8px_32px_rgba(20,184,166,0.1)] active:scale-[0.98] transition-all duration-300 text-center group border border-gray-100"
          >
            <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-3 mx-auto group-hover:from-teal-600 group-hover:to-teal-700 group-hover:scale-105 transition-all duration-200 shadow-sm">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-gray-900 font-semibold text-sm mb-1 leading-tight">New Group</div>
            <div className="text-[11px] text-gray-500 leading-relaxed">Start sharing</div>
          </button>
        </div>

        {/* Recent Transactions - Enhanced typography and polish */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 leading-tight">Recent Activity</h2>
            {allTransactions.length > 5 && (
              <button className="text-emerald-600 text-sm font-medium hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-all duration-200">
                View All
              </button>
            )}
          </div>
          
          {allTransactions.length > 0 ? (
            <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden border border-gray-100">
              {allTransactions.slice(0, 8).map((transaction, index) => (
                <button
                  key={transaction.id}
                  onClick={() => setSelectedTransaction(transaction)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-all duration-200 border-b border-gray-100 last:border-b-0 group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 ${
                    transaction.type === 'expense' ? 'bg-orange-50 text-orange-600' : 
                    transaction.type === 'payment' ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {transaction.type === 'expense' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : transaction.type === 'payment' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900 mb-0.5 leading-tight">{transaction.title}</div>
                    <div className="text-sm text-gray-500 leading-relaxed">
                      {(() => {
                        const transactionGroup = groups.find(g => g.id === transaction.groupId);
                        return (
                          <>
                            {transactionGroup && <span className="font-medium text-emerald-600">{transactionGroup.name}</span>}
                            {transactionGroup && <span className="text-gray-400"> • </span>}
                            <span className="text-gray-500">{transaction.date}</span>
                            {transaction.type === "expense" && transaction.paidByName && (
                              <span className="text-gray-400"> • Paid by {transaction.paidByName}</span>
                            )}
                            {transaction.type === "payment" && transaction.fromName && transaction.toName && (
                              <span className="text-gray-400"> • {transaction.fromName} to {transaction.toName}</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-bold tabular-nums leading-tight ${
                      transaction.type === 'expense' ? 'text-orange-600' : 
                      transaction.type === 'payment' ? 'text-emerald-600' : 'text-emerald-600'
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
