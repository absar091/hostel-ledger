import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowDownLeft, Plus, TrendingUp, TrendingDown, Calendar, User, CreditCard, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import CreateGroupSheet from "@/components/CreateGroupSheet";
import AddMoneySheet from "@/components/AddMoneySheet";
import PaymentConfirmationSheet from "@/components/PaymentConfirmationSheet";
import ErrorAlert from "@/components/ErrorAlert";
import SuccessAlert from "@/components/SuccessAlert";
import FirebasePermissionTest from "@/components/FirebasePermissionTest";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, getWalletBalance, getSettlements, getTotalToReceive, getTotalToPay, getSettlementDelta } = useFirebaseAuth();
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get all transactions including wallet transactions
  const allTransactions = getAllTransactions();
  const settlements = getSettlements();

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
      setError(null);
      const result = await addExpense({
        groupId: data.groupId,
        amount: data.amount,
        paidBy: data.paidBy,
        participants: data.participants,
        note: data.note,
        place: data.place,
      });
      
      if (result.success) {
        setSuccess(`✅ Added expense of Rs ${data.amount.toLocaleString()}`);
        toast.success(`Added expense of Rs ${data.amount.toLocaleString()}`);
      } else {
        if (result.error?.includes("Insufficient")) {
          setError("insufficient_funds");
        } else {
          setError(result.error || "Failed to add expense");
        }
        toast.error(result.error || "Failed to add expense");
      }
    } catch (error) {
      setError("network_error");
      toast.error("Network error. Please check your connection.");
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
      setError(null);
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
        setSuccess(`✅ Recorded Rs ${data.amount.toLocaleString()} from ${memberName}`);
        toast.success(`Recorded Rs ${data.amount.toLocaleString()} from ${memberName}`);
      } else {
        setError(result.error || "Failed to record payment");
        toast.error(result.error || "Failed to record payment");
      }
    } catch (error) {
      setError("network_error");
      toast.error("Network error. Please check your connection.");
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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center">
        <div className="mobile-card w-full sm:max-w-md sm:mx-4 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl rounded-t-3xl">
          <div className="p-6">
            {/* Mobile handle */}
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6 sm:hidden"></div>
            
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-sm border-2 ${
                transaction.type === 'expense' ? 'bg-red-500/20 border-red-400/40' : 
                transaction.type === 'payment' ? 'bg-cyan-500/20 border-cyan-400/40' : 'bg-cyan-500/20 border-cyan-400/40'
              }`}>
                {transaction.type === 'expense' ? (
                  <ArrowUpRight className={`w-8 h-8 text-red-400`} />
                ) : transaction.type === 'payment' ? (
                  <ArrowDownLeft className={`w-8 h-8 text-cyan-400`} />
                ) : (
                  <CreditCard className={`w-8 h-8 text-cyan-400`} />
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{transaction.title}</h2>
              <div className="text-3xl font-bold text-foreground">
                Rs {transaction.amount.toLocaleString()}
              </div>
            </div>

            <div className="space-y-3">
              {/* Date */}
              <div className="flex items-center gap-3 p-4 glass-card">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-sm text-muted-foreground">Date</div>
                  <div className="font-medium text-foreground">{transaction.date}</div>
                </div>
              </div>

              {/* Transaction Type */}
              <div className="flex items-center gap-3 p-4 glass-card">
                <div className={`w-5 h-5 rounded-full ${
                  transaction.type === 'expense' ? 'bg-red-400' : 
                  transaction.type === 'payment' ? 'bg-cyan-400' : 'bg-cyan-400'
                }`}></div>
                <div>
                  <div className="text-sm text-muted-foreground">Type</div>
                  <div className="font-medium text-foreground capitalize">{transaction.type}</div>
                </div>
              </div>

              {/* Group Information */}
              {transactionGroup && (
                <div className="flex items-center gap-3 p-4 glass-card">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="text-sm text-muted-foreground">Group</div>
                    <div className="font-medium text-foreground">{transactionGroup.name}</div>
                    <div className="text-xs text-muted-foreground">{transactionGroup.members.length} members</div>
                  </div>
                </div>
              )}

              {/* Paid By (for expenses) */}
              {transaction.paidByName && (
                <div className="flex items-center gap-3 p-4 glass-card">
                  <User className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="text-sm text-muted-foreground">Paid by</div>
                    <div className="font-medium text-foreground">{transaction.paidByName}</div>
                  </div>
                </div>
              )}

              {/* Payment Details (for payments) */}
              {transaction.fromName && transaction.toName && (
                <div className="flex items-center gap-3 p-4 glass-card">
                  <ArrowUpRight className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="text-sm text-muted-foreground">Payment</div>
                    <div className="font-medium text-foreground">{transaction.fromName} → {transaction.toName}</div>
                    {transaction.method && (
                      <div className="text-xs text-muted-foreground capitalize">via {transaction.method}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Participants (for expenses) */}
              {transaction.participants && transaction.participants.length > 0 && (
                <div className="p-4 glass-card">
                  <div className="text-sm text-muted-foreground mb-3">Participants</div>
                  <div className="space-y-2">
                    {transaction.participants.map((participant: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="font-medium text-foreground">{participant.name}</span>
                        <span className="text-sm text-muted-foreground">Rs {participant.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Place (for expenses) */}
              {transaction.place && (
                <div className="flex items-center gap-3 p-4 glass-card">
                  <div className="w-5 h-5 rounded-full bg-muted"></div>
                  <div>
                    <div className="text-sm text-muted-foreground">Place</div>
                    <div className="font-medium text-foreground">{transaction.place}</div>
                  </div>
                </div>
              )}

              {/* Note */}
              {transaction.note && (
                <div className="p-4 glass-card">
                  <div className="text-sm text-muted-foreground mb-1">Note</div>
                  <div className="font-medium text-foreground">{transaction.note}</div>
                </div>
              )}

              {/* Wallet Balance Changes (for wallet transactions) */}
              {(transaction.walletBalanceBefore !== undefined || transaction.walletBalanceAfter !== undefined) && (
                <div className="space-y-3">
                  {transaction.walletBalanceBefore !== undefined && (
                    <div className="flex items-center gap-3 p-4 glass-card">
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Wallet Balance Before</div>
                        <div className="font-medium text-foreground">Rs {transaction.walletBalanceBefore.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                  
                  {transaction.walletBalanceAfter !== undefined && (
                    <div className="flex items-center gap-3 p-4 glass-card">
                      <CreditCard className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="text-sm text-muted-foreground">Wallet Balance After</div>
                        <div className="font-medium text-foreground">Rs {transaction.walletBalanceAfter.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Balance Change Summary */}
                  {transaction.walletBalanceBefore !== undefined && transaction.walletBalanceAfter !== undefined && (
                    <div className="flex items-center gap-3 p-4 glass-card bg-cyan-500/10 border-cyan-400/20">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        transaction.walletBalanceAfter > transaction.walletBalanceBefore ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        <span className="text-xs text-white font-bold">
                          {transaction.walletBalanceAfter > transaction.walletBalanceBefore ? '+' : '-'}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Balance Change</div>
                        <div className={`font-bold ${
                          transaction.walletBalanceAfter > transaction.walletBalanceBefore ? 'text-green-400' : 'text-red-400'
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

            <button
              onClick={onClose}
              className="w-full mt-6 btn-primary-teal"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 safe-area-pt">
      {/* Header - Mobile Optimized */}
      <div className="mobile-padding pt-8 pb-6">
        <div className="mb-6">
          <div className="text-sm text-muted-foreground mb-1">{getGreeting()}</div>
          <h1 className="text-3xl font-bold text-foreground">{user?.name || "User"}</h1>
        </div>

        {/* Error and Success Alerts */}
        {error && (
          <ErrorAlert
            type={error.includes("Insufficient") ? "insufficient_funds" : 
                  error.includes("network") ? "network_error" : "general"}
            message={typeof error === "string" ? error : undefined}
            onDismiss={() => setError(null)}
            onAddMoney={() => {
              setError(null);
              setShowAddMoney(true);
            }}
          />
        )}
        
        {success && (
          <SuccessAlert
            message={success}
            onDismiss={() => setSuccess(null)}
          />
        )}
      </div>

      {/* Dashboard Cards - Mobile First */}
      <div className="mobile-padding space-y-6">
        {/* Main Wallet Card - Now matches shortcut card styling */}
        <button
          onClick={() => setShowAddMoney(true)}
          className="glass-card p-6 w-full text-left hover:bg-cyan-500/10 transition-all duration-200 group"
        >
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="text-muted-foreground text-sm mb-2">Available Balance</div>
              <div className="text-currency-large text-foreground mb-1">
                Rs {walletBalance.toLocaleString()}
              </div>
              <div className="text-muted-foreground text-sm">Tap to add money</div>
            </div>
            <div className="touch-target w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-full flex items-center justify-center border border-cyan-400/40 group-hover:border-cyan-400/60 transition-all">
              <Plus className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          {/* Settlement Delta Section */}
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-cyan-400/30 rounded-full"></div>
              <span className="text-foreground text-sm">Settlement Delta</span>
            </div>
            <div className={`text-currency-medium mb-1 ${
              settlementDelta > 0 ? 'text-cyan-400' : 
              settlementDelta < 0 ? 'text-red-400' : 
              'text-foreground'
            }`}>
              {settlementDelta > 0 ? '+' : ''}Rs {settlementDelta.toLocaleString()}
            </div>
            <div className="text-muted-foreground text-xs">
              Pending group settlements
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="glass-card p-4 bg-green-500/10 border-green-400/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">You'll Receive</span>
              </div>
              <div className="text-currency-small text-green-400 font-bold">Rs {totalToReceive.toLocaleString()}</div>
            </div>
            
            <div className="glass-card p-4 bg-red-500/10 border-red-400/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm font-medium">You Owe</span>
              </div>
              <div className="text-currency-small text-red-400 font-bold">Rs {totalToPay.toLocaleString()}</div>
            </div>
          </div>
        </button>

        {/* Quick Actions - Mobile Optimized */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleAddExpense}
            className="glass-card p-4 hover:bg-cyan-500/10 transition-all duration-200 text-center group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-xl flex items-center justify-center mb-3 mx-auto border border-cyan-400/40 group-hover:border-cyan-400/60 transition-all">
              <Plus className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-foreground font-medium text-sm">Add Expense</div>
          </button>
          
          <button
            onClick={handleReceivedMoney}
            className="glass-card p-4 hover:bg-cyan-500/10 transition-all duration-200 text-center group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-xl flex items-center justify-center mb-3 mx-auto border border-cyan-400/40 group-hover:border-cyan-400/60 transition-all">
              <ArrowDownLeft className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-foreground font-medium text-sm">Received</div>
          </button>
          
          <button
            onClick={handleNewGroup}
            className="glass-card p-4 hover:bg-cyan-500/10 transition-all duration-200 text-center group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-xl flex items-center justify-center mb-3 mx-auto border border-cyan-400/40 group-hover:border-cyan-400/60 transition-all">
              <User className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-foreground font-medium text-sm">New Group</div>
          </button>
        </div>

        {/* Recent Transactions - Mobile Optimized */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">Recent Transactions</h2>
            {allTransactions.length > 5 && (
              <button className="text-primary text-sm font-medium">View All</button>
            )}
          </div>
          
          {allTransactions.length > 0 ? (
            <div className="mobile-card p-0 overflow-hidden">
              {allTransactions.slice(0, 8).map((transaction) => (
                <button
                  key={transaction.id}
                  onClick={() => setSelectedTransaction(transaction)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm border-2 ${
                    transaction.type === 'expense' ? 'bg-red-500/10 border-red-400/30' : 
                    transaction.type === 'payment' ? 'bg-cyan-500/10 border-cyan-400/30' : 'bg-cyan-500/10 border-cyan-400/30'
                  }`}>
                    {transaction.type === 'expense' ? (
                      <ArrowUpRight className="w-5 h-5 text-red-400" />
                    ) : transaction.type === 'payment' ? (
                      <ArrowDownLeft className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-medium text-foreground mb-1">{transaction.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {transaction.date}
                      {transaction.type === "expense" && transaction.paidByName && (
                        <span> • Paid by {transaction.paidByName}</span>
                      )}
                      {transaction.type === "payment" && transaction.fromName && transaction.toName && (
                        <span> • {transaction.fromName} to {transaction.toName}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-bold ${
                      transaction.type === 'expense' ? 'text-red-400' : 
                      transaction.type === 'payment' ? 'text-cyan-400' : 'text-cyan-400'
                    }`}>
                      {transaction.type === 'expense' ? '-' : '+'}Rs {transaction.amount.toLocaleString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mobile-card p-12 text-center">
              <div className="w-16 h-16 bg-cyan-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-cyan-400/40">
                <CreditCard className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No transactions yet</h3>
              <p className="text-muted-foreground mb-6">Start by creating a group or adding an expense</p>
              <button
                onClick={groups.length === 0 ? handleNewGroup : handleAddExpense}
                className="btn-primary-teal"
              >
                {groups.length === 0 ? "Create Your First Group" : "Add Your First Expense"}
              </button>
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