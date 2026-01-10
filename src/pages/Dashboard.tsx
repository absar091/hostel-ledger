import { useState } from "react";
import WalletCard from "@/components/WalletCard";
import QuickActions from "@/components/QuickActions";
import GroupCard from "@/components/GroupCard";
import BottomNav from "@/components/BottomNav";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import { toast } from "sonner";

// Mock data - will be replaced with real data from database
const mockGroups = [
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

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("home");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  const totalReceive = mockGroups.filter((g) => g.balance > 0).reduce((sum, g) => sum + g.balance, 0);
  const totalOwe = Math.abs(mockGroups.filter((g) => g.balance < 0).reduce((sum, g) => sum + g.balance, 0));

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === "add") {
      setShowAddExpense(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleAddExpense = () => setShowAddExpense(true);
  
  const handleReceivedMoney = () => setShowRecordPayment(true);
  
  const handleNewGroup = () => {
    toast.info("Create group feature coming soon!");
  };

  const handleGroupClick = (groupId: string) => {
    toast.info(`Opening group ${groupId}...`);
  };

  const handleExpenseSubmit = (data: {
    amount: number;
    paidBy: string;
    participants: string[];
    note: string;
    place: string;
  }) => {
    console.log("Expense added:", data);
    toast.success(`Added expense of Rs ${data.amount}`);
  };

  const handlePaymentSubmit = (data: {
    fromMember: string;
    amount: number;
    method: "cash" | "online";
    note: string;
  }) => {
    const memberName = mockMembers.find((m) => m.id === data.fromMember)?.name;
    console.log("Payment recorded:", data);
    toast.success(`Recorded Rs ${data.amount} from ${memberName}`);
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

        {/* Groups Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Your Groups</h2>
            <button className="text-sm text-primary font-medium">See all</button>
          </div>
          
          <div className="space-y-3">
            {mockGroups.map((group, index) => (
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
        </section>

        {/* Empty state for no groups */}
        {mockGroups.length === 0 && (
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
    </div>
  );
};

export default Dashboard;
