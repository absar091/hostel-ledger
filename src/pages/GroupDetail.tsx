import { useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import TimelineItem from "@/components/TimelineItem";
import Avatar from "@/components/Avatar";
import { useNavigate, useParams } from "react-router-dom";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import { toast } from "sonner";
import { Plus, HandCoins } from "lucide-react";

// Mock data for all groups
const groupsData: Record<string, {
  id: string;
  name: string;
  emoji: string;
  totalPending: number;
  members: { id: string; name: string; balance: number }[];
  timeline: {
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
  }[];
}> = {
  "1": {
    id: "1",
    name: "Roommates",
    emoji: "🏠",
    totalPending: 1200,
    members: [
      { id: "1", name: "You", balance: 450 },
      { id: "2", name: "Ali", balance: -200 },
      { id: "3", name: "Bilal", balance: -150 },
      { id: "4", name: "Hassan", balance: -100 },
    ],
    timeline: [
      {
        id: "1",
        type: "payment",
        title: "Payment Received",
        amount: 400,
        date: "Today",
        from: "Ali",
        to: "You",
        method: "cash",
      },
      {
        id: "2",
        type: "expense",
        title: "Dinner – Student Café",
        amount: 1200,
        date: "Yesterday",
        paidBy: "You",
        category: "food",
        participants: [
          { name: "Ali", amount: 400 },
          { name: "Bilal", amount: 400 },
        ],
      },
      {
        id: "3",
        type: "expense",
        title: "Groceries",
        amount: 800,
        date: "2 days ago",
        paidBy: "Hassan",
        category: "shopping",
        participants: [
          { name: "You", amount: 200 },
          { name: "Ali", amount: 200 },
          { name: "Bilal", amount: 200 },
        ],
      },
    ],
  },
  "2": {
    id: "2",
    name: "Mess Group",
    emoji: "🍽️",
    totalPending: 800,
    members: [
      { id: "1", name: "You", balance: -300 },
      { id: "2", name: "Zain", balance: 150 },
      { id: "3", name: "Faisal", balance: 100 },
      { id: "4", name: "Imran", balance: 50 },
      { id: "5", name: "Umar", balance: 0 },
      { id: "6", name: "Tariq", balance: 0 },
    ],
    timeline: [
      {
        id: "1",
        type: "expense",
        title: "Mess Fee – January",
        amount: 3000,
        date: "3 days ago",
        paidBy: "Zain",
        category: "food",
        participants: [
          { name: "You", amount: 500 },
          { name: "Faisal", amount: 500 },
          { name: "Imran", amount: 500 },
          { name: "Umar", amount: 500 },
          { name: "Tariq", amount: 500 },
        ],
      },
      {
        id: "2",
        type: "payment",
        title: "Payment Received",
        amount: 500,
        date: "2 days ago",
        from: "Faisal",
        to: "Zain",
        method: "online",
      },
    ],
  },
  "3": {
    id: "3",
    name: "Trip Friends",
    emoji: "✈️",
    totalPending: 2500,
    members: [
      { id: "1", name: "You", balance: 1200 },
      { id: "2", name: "Ahmed", balance: -400 },
      { id: "3", name: "Saad", balance: -400 },
      { id: "4", name: "Waqas", balance: -200 },
      { id: "5", name: "Kamran", balance: -200 },
    ],
    timeline: [
      {
        id: "1",
        type: "expense",
        title: "Hotel Booking",
        amount: 5000,
        date: "Last week",
        paidBy: "You",
        category: "other",
        participants: [
          { name: "Ahmed", amount: 1000 },
          { name: "Saad", amount: 1000 },
          { name: "Waqas", amount: 1000 },
          { name: "Kamran", amount: 1000 },
        ],
      },
      {
        id: "2",
        type: "expense",
        title: "Transport",
        amount: 2000,
        date: "Last week",
        paidBy: "Ahmed",
        category: "transport",
        participants: [
          { name: "You", amount: 400 },
          { name: "Saad", amount: 400 },
          { name: "Waqas", amount: 400 },
          { name: "Kamran", amount: 400 },
        ],
      },
      {
        id: "3",
        type: "payment",
        title: "Payment Received",
        amount: 600,
        date: "5 days ago",
        from: "Ahmed",
        to: "You",
        method: "cash",
      },
    ],
  },
};

const GroupDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"ledger" | "members" | "summary">("ledger");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  const group = id ? groupsData[id] : null;

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Group not found</h2>
          <Button onClick={() => navigate("/")}>Go Back</Button>
        </div>
      </div>
    );
  }

  const members = group.members.map((m) => ({ id: m.id, name: m.name }));

  const handleExpenseSubmit = (data: {
    amount: number;
    paidBy: string;
    participants: string[];
    note: string;
    place: string;
  }) => {
    toast.success(`Added expense of Rs ${data.amount} to ${group.name}`);
  };

  const handlePaymentSubmit = (data: {
    fromMember: string;
    amount: number;
    method: "cash" | "online";
    note: string;
  }) => {
    const memberName = members.find((m) => m.id === data.fromMember)?.name;
    toast.success(`Recorded Rs ${data.amount} from ${memberName}`);
  };

  // Calculate summary data
  const totalSpent = group.timeline
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseCount = group.timeline.filter((t) => t.type === "expense").length;
  const topSpender = group.members.reduce((prev, curr) =>
    curr.balance > prev.balance ? curr : prev
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{group.emoji}</span>
                <h1 className="text-xl font-bold text-foreground">{group.name}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {group.members.length} members • Rs {group.totalPending.toLocaleString()} pending
              </p>
            </div>
            
            <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-4">
          {[
            { id: "ledger", label: "Ledger" },
            { id: "members", label: "Members" },
            { id: "summary", label: "Summary" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4">
        {activeTab === "ledger" && (
          <div className="space-y-3 animate-fade-in">
            {group.timeline.length > 0 ? (
              group.timeline.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <TimelineItem
                    type={item.type}
                    title={item.title}
                    amount={item.amount}
                    date={item.date}
                    paidBy={item.paidBy}
                    participants={item.participants}
                    from={item.from}
                    to={item.to}
                    method={item.method}
                    category={item.category}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No transactions yet</h3>
                <p className="text-muted-foreground text-sm">
                  Add an expense to get started
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-3 animate-fade-in">
            {group.members.map((member, index) => {
              const isPositive = member.balance >= 0;
              return (
                <div
                  key={member.id}
                  className="bg-card rounded-xl p-4 shadow-card flex items-center gap-4 animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Avatar name={member.name} size="lg" />
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{member.name}</div>
                    <div className={`text-sm ${isPositive ? "text-positive" : "text-negative"}`}>
                      {member.balance === 0
                        ? "settled up"
                        : isPositive
                        ? `will receive Rs ${member.balance}`
                        : `owes Rs ${Math.abs(member.balance)}`}
                    </div>
                  </div>
                  {member.name !== "You" && member.balance !== 0 && (
                    <Button variant="outline" size="sm">
                      Settle
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "summary" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-semibold text-foreground mb-4">Group Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-foreground">Rs {totalSpent.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{expenseCount}</div>
                  <div className="text-sm text-muted-foreground">Expenses</div>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-semibold text-foreground mb-4">Top Contributor</h3>
              <div className="flex items-center gap-3">
                <Avatar name={topSpender.name} size="lg" />
                <div>
                  <div className="font-semibold">{topSpender.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {topSpender.balance >= 0 
                      ? `Rs ${topSpender.balance} to receive` 
                      : `Rs ${Math.abs(topSpender.balance)} owes`}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-semibold text-foreground mb-4">Members</h3>
              <div className="flex -space-x-2">
                {group.members.slice(0, 5).map((member) => (
                  <Avatar key={member.id} name={member.name} size="md" />
                ))}
                {group.members.length > 5 && (
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                    +{group.members.length - 5}
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {group.members.length} members in this group
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 left-4 right-4 flex gap-3">
        <Button 
          onClick={() => setShowRecordPayment(true)}
          variant="outline"
          className="flex-1 h-12 rounded-xl text-base font-semibold"
        >
          <HandCoins className="w-5 h-5 mr-2" />
          Record Payment
        </Button>
        <Button 
          onClick={() => setShowAddExpense(true)}
          className="flex-1 h-12 rounded-xl text-base font-semibold shadow-wallet"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Sheets */}
      <AddExpenseSheet
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        members={members}
        onSubmit={handleExpenseSubmit}
      />

      <RecordPaymentSheet
        open={showRecordPayment}
        onClose={() => setShowRecordPayment(false)}
        members={members}
        onSubmit={handlePaymentSubmit}
      />
    </div>
  );
};

export default GroupDetail;
