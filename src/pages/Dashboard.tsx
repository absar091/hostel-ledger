import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import WalletCard from "@/components/WalletCard";
import QuickActions from "@/components/QuickActions";
import GroupCard from "@/components/GroupCard";
import BottomNav from "@/components/BottomNav";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import CreateGroupSheet from "@/components/CreateGroupSheet";
import TimelineItem from "@/components/TimelineItem";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups, transactions, createGroup, addExpense, recordPayment } = useData();
  
  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("home");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Calculate totals from all groups
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

  // Get all members across groups for expense sheet
  const allMembers = useMemo(() => {
    if (groups.length === 0) return [];
    // Get members from first group for now (user should select group first ideally)
    return groups[0]?.members.map((m) => ({
      id: m.id,
      name: m.name,
    })) || [];
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

  const handleExpenseSubmit = (data: {
    amount: number;
    paidBy: string;
    participants: string[];
    note: string;
    place: string;
  }) => {
    if (groups.length === 0) return;
    
    addExpense({
      groupId: groups[0].id, // Default to first group from dashboard
      amount: data.amount,
      paidBy: data.paidBy,
      participants: data.participants,
      note: data.note,
      place: data.place,
    });
    toast.success(`Added expense of Rs ${data.amount}`);
  };

  const handlePaymentSubmit = (data: {
    fromMember: string;
    amount: number;
    method: "cash" | "online";
    note: string;
  }) => {
    if (groups.length === 0) return;
    
    const currentUser = groups[0].members.find((m) => m.isCurrentUser);
    if (!currentUser) return;

    recordPayment({
      groupId: groups[0].id,
      fromMember: data.fromMember,
      toMember: currentUser.id,
      amount: data.amount,
      method: data.method,
      note: data.note,
    });
    
    const memberName = groups[0].members.find((m) => m.id === data.fromMember)?.name || "Unknown";
    toast.success(`Recorded Rs ${data.amount} from ${memberName}`);
  };

  const handleGroupSubmit = (data: {
    name: string;
    emoji: string;
    members: { name: string; phone?: string; paymentDetails?: { jazzCash?: string; easypaisa?: string; bankName?: string; accountNumber?: string; raastId?: string } }[];
  }) => {
    createGroup({
      name: data.name,
      emoji: data.emoji,
      members: data.members.map((m) => ({
        name: m.name,
        phone: m.phone,
        paymentDetails: m.paymentDetails,
      })),
    });
    toast.success(`Created group "${data.name}"`);
  };

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

        {/* Wallet Card */}
        <WalletCard toReceive={totalReceive} toOwe={totalOwe} />
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
              {transactions.length > 0 && (
                <button 
                  onClick={() => setActiveTab("activity")}
                  className="text-sm text-primary font-medium"
                >
                  See all
                </button>
              )}
            </div>
            
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction, index) => (
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
            
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((transaction, index) => (
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
          members={allMembers}
          onSubmit={handleExpenseSubmit}
        />
      )}

      {/* Record Payment Sheet */}
      {groups.length > 0 && (
        <RecordPaymentSheet
          open={showRecordPayment}
          onClose={() => setShowRecordPayment(false)}
          members={allMembers}
          onSubmit={handlePaymentSubmit}
        />
      )}

      {/* Create Group Sheet */}
      <CreateGroupSheet
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onSubmit={handleGroupSubmit}
      />
    </div>
  );
};

export default Dashboard;
