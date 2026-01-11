import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import WalletCard from "@/components/WalletCard";
import QuickActions from "@/components/QuickActions";
import GroupCard from "@/components/GroupCard";
import BottomNav from "@/components/BottomNav";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import CreateGroupSheet from "@/components/CreateGroupSheet";
import AddMoneySheet from "@/components/AddMoneySheet";
import PaymentConfirmationSheet from "@/components/PaymentConfirmationSheet";
import TimelineItem from "@/components/TimelineItem";
import ErrorAlert from "@/components/ErrorAlert";
import SuccessAlert from "@/components/SuccessAlert";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, getWalletBalance, getSettlements } = useFirebaseAuth();
  const { groups, transactions, isLoading, createGroup, addExpense, recordPayment, addMoneyToWallet, payMyDebt, getAllTransactions } = useFirebaseData();
  
  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("home");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
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

  // Calculate totals from all groups (keeping for backward compatibility)
  const { totalReceive, totalOwe } = useMemo(() => {
    let receive = 0;
    let owe = 0;

    groups.forEach((group) => {
      const currentUserMember = group.members.find((m) => m.isCurrentUser);
      if (currentUserMember) {
        if (currentUserMember.balance > 0) {
          receive += currentUserMember.balance;
        } else {
          owe += Math.abs(currentUserMember.balance);
        }
      }
    });

    return { totalReceive: receive, totalOwe: owe };
  }, [groups]);

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

  const handleGroupClick = (groupId: string) => {
    navigate(`/group/${groupId}`);
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

  // Find members you owe money to (using new settlement system)
  const membersYouOwe = useMemo(() => {
    const owedMembers: Array<{ id: string; name: string; amount: number; groupId?: string }> = [];
    
    // Get debts from settlement system
    Object.entries(settlements).forEach(([personId, settlement]) => {
      if (settlement.toPay > 0) {
        // Find the person's name from groups
        let personName = "Member";
        let groupId = "";
        
        groups.forEach(group => {
          const member = group.members.find(m => m.id === personId);
          if (member) {
            personName = member.name;
            groupId = group.id;
          }
        });
        
        owedMembers.push({
          id: personId,
          name: personName,
          amount: settlement.toPay,
          groupId: groupId
        });
      }
    });
    
    return owedMembers.sort((a, b) => b.amount - a.amount); // Highest debt first
  }, [settlements, groups]);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-muted-foreground text-sm">{getGreeting()}</div>
            <h1 className="text-2xl font-bold text-foreground">{user?.name || "Hostel Wallet"}</h1>
          </div>
          <button 
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <span className="text-lg">👋</span>
          </button>
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

        {/* Wallet Card */}
        <WalletCard onAddMoney={() => setShowAddMoney(true)} />
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-6">
        {/* Quick Actions */}
        <QuickActions
          onAddExpense={handleAddExpense}
          onReceivedMoney={handleReceivedMoney}
          onNewGroup={handleNewGroup}
        />

        {/* Home Tab - Recent Transactions */}
        {activeTab === "home" && (
          <section className="animate-fade-in">
            {/* Quick Pay Section */}
            {membersYouOwe.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Quick Pay</h3>
                <div className="space-y-2">
                  {membersYouOwe.slice(0, 3).map((member) => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setSelectedMemberForPayment(member);
                        setShowPaymentConfirmation(true);
                      }}
                      className="w-full bg-card rounded-xl p-3 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between"
                    >
                      <div className="text-left">
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-negative">You owe Rs {member.amount.toLocaleString()}</div>
                      </div>
                      <div className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-sm font-medium">
                        Pay Now
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
              {allTransactions.length > 0 && (
                <button 
                  onClick={() => setActiveTab("activity")}
                  className="text-sm text-primary font-medium"
                >
                  See all
                </button>
              )}
            </div>
            
            {allTransactions.length > 0 ? (
              <div className="space-y-3">
                {allTransactions.slice(0, 5).map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    <TimelineItem
                      type={transaction.type}
                      title={transaction.title}
                      amount={transaction.amount}
                      date={transaction.date}
                      paidBy={transaction.type === "expense" ? transaction.paidByName : undefined}
                      participants={transaction.type === "expense" ? transaction.participants : undefined}
                      from={transaction.type === "payment" ? transaction.fromName : undefined}
                      to={transaction.type === "payment" ? transaction.toName : undefined}
                      method={transaction.type === "payment" ? transaction.method : undefined}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 animate-fade-in">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No transactions yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {groups.length === 0 
                    ? "Create a group to start tracking expenses"
                    : "Add an expense or record a payment to get started"
                  }
                </p>
                <button
                  onClick={groups.length === 0 ? handleNewGroup : handleAddExpense}
                  className="text-primary font-medium"
                >
                  {groups.length === 0 ? "+ Create your first group" : "+ Add your first expense"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Groups Tab */}
        {activeTab === "groups" && (
          <section className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Your Groups</h2>
              <button 
                onClick={handleNewGroup}
                className="text-sm text-primary font-medium"
              >
                + New Group
              </button>
            </div>
            
            {groups.length > 0 ? (
              <div className="space-y-3">
                {groups.map((group, index) => {
                  const currentUser = group.members.find((m) => m.isCurrentUser);
                  const balance = currentUser?.balance || 0;
                  
                  return (
                    <div
                      key={group.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                    >
                      <GroupCard
                        name={group.name}
                        emoji={group.emoji}
                        balance={balance}
                        memberCount={group.members.length}
                        onClick={() => handleGroupClick(group.id)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 animate-fade-in">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No groups yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create a group to start tracking shared expenses
                </p>
                <button
                  onClick={handleNewGroup}
                  className="text-primary font-medium"
                >
                  + Create your first group
                </button>
              </div>
            )}
          </section>
        )}

        {/* Activity Tab - All Transactions */}
        {activeTab === "activity" && (
          <section className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">All Activity</h2>
            </div>
            
            {allTransactions.length > 0 ? (
              <div className="space-y-3">
                {allTransactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    <TimelineItem
                      type={transaction.type}
                      title={transaction.title}
                      amount={transaction.amount}
                      date={transaction.date}
                      paidBy={transaction.type === "expense" ? transaction.paidByName : undefined}
                      participants={transaction.type === "expense" ? transaction.participants : undefined}
                      from={transaction.type === "payment" ? transaction.fromName : undefined}
                      to={transaction.type === "payment" ? transaction.toName : undefined}
                      method={transaction.type === "payment" ? transaction.method : undefined}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 animate-fade-in">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No activity yet</h3>
                <p className="text-muted-foreground text-sm">
                  Your transactions will appear here
                </p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Add Expense Sheet */}
      {groups.length > 0 && (
        <AddExpenseSheet
          open={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          groups={groupsForSheets}
          onSubmit={handleExpenseSubmit}
        />
      )}

      {/* Record Payment Sheet */}
      {groups.length > 0 && (
        <RecordPaymentSheet
          open={showRecordPayment}
          onClose={() => setShowRecordPayment(false)}
          groups={groupsForSheets}
          onSubmit={handlePaymentSubmit}
        />
      )}

      {/* Create Group Sheet */}
      <CreateGroupSheet
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onSubmit={handleGroupSubmit}
      />

      {/* Add Money Sheet */}
      <AddMoneySheet
        open={showAddMoney}
        onClose={() => setShowAddMoney(false)}
        onSubmit={handleAddMoney}
      />

      {/* Payment Confirmation Sheet */}
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
