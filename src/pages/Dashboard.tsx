import { useState, useMemo } from "react";
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
import { toast } from "sonner";
import Tooltip from "@/components/Tooltip";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, getWalletBalance, getTotalToReceive, getTotalToPay, getSettlementDelta } = useFirebaseAuth();
  const { groups, createGroup, addExpense, recordPayment, addMoneyToWallet, payMyDebt, getAllTransactions } = useFirebaseData();
  
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

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 pb-20 safe-area-pt">
      {/* Header with Enhanced Personalization */}
      <div className="mobile-padding pt-8 pb-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {/* Profile Avatar with Photo */}
              <Avatar 
                name={user?.name || "User"} 
                photoURL={user?.photoURL} 
                size="lg" 
              />
              <div>
                <div className="text-sm text-gray-500">{getGreeting()}</div>
                <h1 className="text-2xl font-bold text-gray-900">{user?.name || "User"}</h1>
              </div>
            </div>
            {/* PWA Install Button */}
            <PWAInstallButton />
          </div>
        </div>
      </div>

      {/* Dashboard Cards - Production-Grade Fintech UI */}
      <div className="mobile-padding">
        {/* Available Balance Card - Compact Premium Primary Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[24px] p-5 shadow-[0_12px_30px_rgba(16,185,129,0.15),0_4px_12px_rgba(16,185,129,0.1)] animate-[slideUp_0.5s_ease_forwards] text-white hover:scale-[0.98] active:scale-[0.96] transition-all duration-200 cursor-pointer mb-6"
             onClick={() => setShowAddMoney(true)}>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase opacity-90 text-white">Available Balance</span>
              <Tooltip 
                content="This is the actual money in your wallet that you can spend right now. It doesn't include money others owe you."
                position="bottom"
              >
                <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center cursor-help">
                  <span className="text-[10px] font-bold text-white">?</span>
                </div>
              </Tooltip>
            </div>
            <button 
              className="bg-white/25 border-0 text-white w-10 h-10 rounded-full text-2xl cursor-pointer hover:bg-white/35 active:scale-95 transition-all flex items-center justify-center shadow-inner"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="text-4xl font-extrabold tracking-tight leading-tight mb-1 text-white tabular-nums">
            <span className="text-2xl opacity-90">Rs </span>{walletBalance.toLocaleString()}
          </div>
          
          {/* Subtle After Settlements - Secondary Info */}
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center gap-2">
              <div className="text-xs opacity-70 text-white/80">
                After settlements: <span className="tabular-nums font-medium">Rs {(walletBalance + settlementDelta).toLocaleString()}</span>
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

        <div className="space-y-4">
          {/* Settlement Delta Card - Clickable with Chevron */}
          <button 
            onClick={() => navigate("/groups")}
            className="w-full bg-white rounded-[20px] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] animate-[slideUp_0.5s_ease_forwards] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${settlementDelta < 0 ? 'bg-orange-400' : settlementDelta > 0 ? 'bg-emerald-400' : 'bg-gray-400'}`}></div>
                <span className="text-xs font-semibold tracking-wider uppercase opacity-85 text-gray-700">Settlement Delta</span>
                <Tooltip 
                  content="The net amount you'll receive (+) or owe (-) after all group settlements. This is calculated from all your group expenses and payments."
                  position="top"
                >
                  <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center cursor-help">
                    <span className="text-[10px] font-bold text-gray-600">?</span>
                  </div>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2">
                {settlementDelta < 0 && <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">↓ Pending</span>}
                {settlementDelta > 0 && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">↑ Incoming</span>}
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <div className={`text-3xl font-extrabold tracking-tight leading-tight mb-1 tabular-nums ${
              settlementDelta < 0 ? 'text-orange-600' : settlementDelta > 0 ? 'text-emerald-600' : 'text-gray-900'
            }`}>
              <span className="text-xl opacity-90">Rs </span>{settlementDelta > 0 ? '' : '−'}{Math.abs(settlementDelta).toLocaleString()}
            </div>
            <div className="text-xs leading-tight opacity-70 text-gray-600 font-medium">
              Tap to view group details
            </div>
          </button>

          {/* Receive / Owe Split Cards - Clickable with Chevrons */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate("/groups")}
              className="bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-100/50 rounded-[20px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] animate-[slideUp_0.5s_ease_forwards] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold tracking-wider uppercase opacity-85 text-emerald-700">To Receive</span>
                  <Tooltip 
                    content="Total amount that group members owe you from shared expenses. This money will come to your wallet when they pay you."
                    position="top"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-200 flex items-center justify-center cursor-help">
                      <span className="text-[9px] font-bold text-emerald-700">?</span>
                    </div>
                  </Tooltip>
                </div>
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="text-2xl font-extrabold tracking-tight leading-tight text-emerald-700 tabular-nums">
                <span className="text-base opacity-90">Rs </span>{totalToReceive.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600 mt-1 opacity-70">View details</div>
            </button>
            
            <button 
              onClick={() => navigate("/groups")}
              className="bg-gradient-to-br from-white to-red-50/30 border border-red-100/50 rounded-[20px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] animate-[slideUp_0.5s_ease_forwards] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold tracking-wider uppercase opacity-85 text-red-700">To Pay</span>
                  <Tooltip 
                    content="Total amount you owe to group members from shared expenses. You'll need to pay this from your wallet or record payments."
                    position="top"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-red-200 flex items-center justify-center cursor-help">
                      <span className="text-[9px] font-bold text-red-700">?</span>
                    </div>
                  </Tooltip>
                </div>
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="text-2xl font-extrabold tracking-tight leading-tight text-red-600 tabular-nums">
                <span className="text-base opacity-90">Rs </span>{totalToPay.toLocaleString()}
              </div>
              <div className="text-[10px] text-red-600 mt-1 opacity-70">View details</div>
            </button>
          </div>
        </div>

        {/* Quick Actions - Consistent Green/Teal Palette with Readable Helper Text */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <button
            onClick={handleAddExpense}
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/90 active:scale-95 transition-all duration-200 text-center group border border-white/50 shadow-sm hover:shadow-md hover:border-emerald-200"
          >
            <div className="w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 group-active:scale-95 transition-all shadow-sm border border-gray-200">
              <Plus className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-gray-900 font-semibold text-sm mb-1">Add Expense</div>
            <div className="text-[11px] text-gray-500 font-normal">Split a bill</div>
          </button>
          
          <button
            onClick={handleReceivedMoney}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 hover:from-emerald-100 hover:to-teal-100 active:scale-95 transition-all duration-200 text-center group border border-emerald-200/50 shadow-sm hover:shadow-md hover:border-emerald-300"
          >
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 group-active:scale-95 transition-all shadow-md">
              <ArrowDownLeft className="w-6 h-6 text-white" />
            </div>
            <div className="text-gray-900 font-semibold text-sm mb-1">Received</div>
            <div className="text-[11px] text-gray-500 font-normal">Record payment</div>
          </button>
          
          <button
            onClick={handleNewGroup}
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/90 active:scale-95 transition-all duration-200 text-center group border border-white/50 shadow-sm hover:shadow-md hover:border-teal-200"
          >
            <div className="w-11 h-11 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 group-active:scale-95 transition-all shadow-sm border border-teal-200">
              <User className="w-6 h-6 text-teal-600" />
            </div>
            <div className="text-gray-900 font-semibold text-sm mb-1">New Group</div>
            <div className="text-[11px] text-gray-500 font-normal">Start sharing</div>
          </button>
        </div>

        {/* Recent Transactions - Enhanced with Personality */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            {allTransactions.length > 5 && (
              <button className="text-emerald-600 text-sm font-medium hover:text-emerald-700 transition-colors">
                View All
              </button>
            )}
          </div>
          
          {allTransactions.length > 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden border border-white/50">
              {allTransactions.slice(0, 8).map((transaction) => (
                <button
                  key={transaction.id}
                  onClick={() => setSelectedTransaction(transaction)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                    transaction.type === 'expense' ? 'bg-red-50 border-red-100' : 
                    transaction.type === 'payment' ? 'bg-emerald-50 border-emerald-100' : 'bg-emerald-50 border-emerald-100'
                  }`}>
                    {transaction.type === 'expense' ? (
                      <ArrowUpRight className="w-5 h-5 text-red-500" />
                    ) : transaction.type === 'payment' ? (
                      <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900 mb-1">{transaction.title}</div>
                    <div className="text-sm text-gray-500">
                      {(() => {
                        const transactionGroup = groups.find(g => g.id === transaction.groupId);
                        return (
                          <>
                            {transactionGroup && <span className="font-medium text-emerald-600">{transactionGroup.name}</span>}
                            {transactionGroup && <span> • </span>}
                            {transaction.date}
                            {transaction.type === "expense" && transaction.paidByName && (
                              <span> • Paid by {transaction.paidByName}</span>
                            )}
                            {transaction.type === "payment" && transaction.fromName && transaction.toName && (
                              <span> • {transaction.fromName} to {transaction.toName}</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-bold ${
                      transaction.type === 'expense' ? 'text-red-500' : 
                      transaction.type === 'payment' ? 'text-emerald-500' : 'text-emerald-500'
                    }`}>
                      {transaction.type === 'expense' ? '-' : '+'}Rs {transaction.amount.toLocaleString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center shadow-sm border border-white/50">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <Plus className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to start your journey?</h3>
              <p className="text-gray-500 mb-6">Your financial adventure begins with your first transaction!</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={groups.length === 0 ? handleNewGroup : handleAddExpense}
                  className="py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
                >
                  {groups.length === 0 ? "Create Your First Group" : "Add Your First Expense"}
                </button>
                <div className="text-xs text-gray-400">
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
