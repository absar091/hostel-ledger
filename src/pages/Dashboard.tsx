import { useState } from "react";
import WalletCard from "@/components/WalletCard";
import QuickActions from "@/components/QuickActions";
import GroupCard from "@/components/GroupCard";
import BottomNav from "@/components/BottomNav";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import CreateGroupSheet from "@/components/CreateGroupSheet";
import TimelineItem from "@/components/TimelineItem";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Mock data - replaced with real data from database later
const initialGroups = [
  { id: "1", name: "Roommates", emoji: "🏠", balance: 450, memberCount: 4 },
  { id: "2", name: "Mess Group", emoji: "🍽️", balance: -300, memberCount: 6 },
  { id: "3", name: "Trip Friends", emoji: "✈️", balance: 1200, memberCount: 5 },
];

const mockMembers = [
  { id: "1", name: "You" },
  { id: "2", name: "Ali" },
  { id: "3", name: "Bilal" },
  { id: "4", name: "Hassan" },
];

type Transaction = {
  id: string;
  type: "expense" | "payment";
  title: string;
  amount: number;
  date: string;
  paidBy?: string;
  category?: "food" | "shopping" | "transport" | "coffee" | "other";
  participants?: { name: string; amount: number }[];
  from?: string;
  to?: string;
  method?: string;
};

// Mock transactions data
const initialTransactions: Transaction[] = [
  {
    id: "t1",
    type: "expense",
    title: "Dinner at Cafe",
    amount: 1200,
    date: "Today",
    paidBy: "You",
    category: "food",
    participants: [
      { name: "Ali", amount: 300 },
      { name: "Bilal", amount: 300 },
      { name: "Hassan", amount: 300 },
    ],
  },
  {
    id: "t2",
    type: "payment",
    title: "Payment Received",
    amount: 500,
    date: "Yesterday",
    from: "Ali",
    to: "You",
    method: "cash",
  },
  {
    id: "t3",
    type: "expense",
    title: "Groceries",
    amount: 800,
    date: "Yesterday",
    paidBy: "Bilal",
    category: "shopping",
    participants: [
      { name: "You", amount: 200 },
      { name: "Hassan", amount: 200 },
    ],
  },
  {
    id: "t4",
    type: "payment",
    title: "Payment Received",
    amount: 300,
    date: "2 days ago",
    from: "Hassan",
    to: "You",
    method: "online",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("home");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groups, setGroups] = useState(initialGroups);
  const [transactions, setTransactions] = useState(initialTransactions);

  const totalReceive = groups.filter((g) => g.balance > 0).reduce((sum, g) => sum + g.balance, 0);
  const totalOwe = Math.abs(groups.filter((g) => g.balance < 0).reduce((sum, g) => sum + g.balance, 0));

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === "add") {
      setShowAddExpense(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleAddExpense = () => setShowAddExpense(true);
  
  const handleReceivedMoney = () => setShowRecordPayment(true);
  
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
    const paidByName = mockMembers.find((m) => m.id === data.paidBy)?.name || "Unknown";
    const newTransaction: Transaction = {
      id: `t${transactions.length + 1}`,
      type: "expense",
      title: data.note || "New Expense",
      amount: data.amount,
      date: "Just now",
      paidBy: paidByName,
      category: "other",
      participants: data.participants
        .filter((id) => id !== data.paidBy)
        .map((id) => ({
          name: mockMembers.find((m) => m.id === id)?.name || "Unknown",
          amount: Math.round(data.amount / data.participants.length),
        })),
    };
    setTransactions([newTransaction, ...transactions]);
    toast.success(`Added expense of Rs ${data.amount}`);
  };

  const handlePaymentSubmit = (data: {
    fromMember: string;
    amount: number;
    method: "cash" | "online";
    note: string;
  }) => {
    const memberName = mockMembers.find((m) => m.id === data.fromMember)?.name || "Unknown";
    const newTransaction: Transaction = {
      id: `t${transactions.length + 1}`,
      type: "payment",
      title: "Payment Received",
      amount: data.amount,
      date: "Just now",
      from: memberName,
      to: "You",
      method: data.method,
    };
    setTransactions([newTransaction, ...transactions]);
    toast.success(`Recorded Rs ${data.amount} from ${memberName}`);
  };

  const handleGroupSubmit = (data: {
    name: string;
    emoji: string;
    members: string[];
  }) => {
    const newGroup = {
      id: String(groups.length + 1),
      name: data.name,
      emoji: data.emoji,
      balance: 0,
      memberCount: data.members.length,
    };
    setGroups([...groups, newGroup]);
    toast.success(`Created group "${data.name}"`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-muted-foreground text-sm">Good morning</div>
            <h1 className="text-2xl font-bold text-foreground">Hostel Wallet</h1>
          </div>
          <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
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
              <button 
                onClick={() => setActiveTab("activity")}
                className="text-sm text-primary font-medium"
              >
                See all
              </button>
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
                      paidBy={transaction.type === "expense" ? transaction.paidBy : undefined}
                      participants={transaction.type === "expense" ? transaction.participants : undefined}
                      from={transaction.type === "payment" ? transaction.from : undefined}
                      to={transaction.type === "payment" ? transaction.to : undefined}
                      method={transaction.type === "payment" ? transaction.method : undefined}
                      category={transaction.type === "expense" ? transaction.category : undefined}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 animate-fade-in">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No transactions yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Add an expense or record a payment to get started
                </p>
                <button
                  onClick={handleAddExpense}
                  className="text-primary font-medium"
                >
                  + Add your first expense
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
                {groups.map((group, index) => (
                  <div
                    key={group.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    <GroupCard
                      name={group.name}
                      emoji={group.emoji}
                      balance={group.balance}
                      memberCount={group.memberCount}
                      onClick={() => handleGroupClick(group.id)}
                    />
                  </div>
                ))}
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
                      paidBy={transaction.type === "expense" ? transaction.paidBy : undefined}
                      participants={transaction.type === "expense" ? transaction.participants : undefined}
                      from={transaction.type === "payment" ? transaction.from : undefined}
                      to={transaction.type === "payment" ? transaction.to : undefined}
                      method={transaction.type === "payment" ? transaction.method : undefined}
                      category={transaction.type === "expense" ? transaction.category : undefined}
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

        {/* Profile Tab Placeholder */}
        {activeTab === "profile" && (
          <section className="animate-fade-in text-center py-12">
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Profile</h3>
            <p className="text-muted-foreground text-sm">
              Coming soon...
            </p>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Add Expense Sheet */}
      <AddExpenseSheet
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        members={mockMembers}
        onSubmit={handleExpenseSubmit}
      />

      {/* Record Payment Sheet */}
      <RecordPaymentSheet
        open={showRecordPayment}
        onClose={() => setShowRecordPayment(false)}
        members={mockMembers}
        onSubmit={handlePaymentSubmit}
      />

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
