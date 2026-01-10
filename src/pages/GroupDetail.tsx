import { useState } from "react";
import { ArrowLeft, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import TimelineItem from "@/components/TimelineItem";
import Avatar from "@/components/Avatar";
import { useNavigate } from "react-router-dom";

// Mock data
const mockGroup = {
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
};

const mockTimeline = [
  {
    id: "1",
    type: "payment" as const,
    title: "Payment Received",
    amount: 400,
    date: "Today",
    from: "Ali",
    to: "You",
    method: "cash",
  },
  {
    id: "2",
    type: "expense" as const,
    title: "Dinner – Student Café",
    amount: 1200,
    date: "Yesterday",
    paidBy: "You",
    category: "food" as const,
    participants: [
      { name: "Ali", amount: 400 },
      { name: "Bilal", amount: 400 },
    ],
  },
  {
    id: "3",
    type: "expense" as const,
    title: "Groceries",
    amount: 800,
    date: "2 days ago",
    paidBy: "Hassan",
    category: "shopping" as const,
    participants: [
      { name: "You", amount: 200 },
      { name: "Ali", amount: 200 },
      { name: "Bilal", amount: 200 },
    ],
  },
];

const GroupDetail = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"ledger" | "members" | "summary">("ledger");

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{mockGroup.emoji}</span>
                <h1 className="text-xl font-bold text-foreground">{mockGroup.name}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Total Pending: Rs {mockGroup.totalPending.toLocaleString()}
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
            {mockTimeline.map((item, index) => (
              <div
                key={item.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <TimelineItem {...item} />
              </div>
            ))}
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-3 animate-fade-in">
            {mockGroup.members.map((member, index) => {
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
                      {isPositive ? "will receive" : "owes"} Rs {Math.abs(member.balance)}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "summary" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-semibold text-foreground mb-4">This Month</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-foreground">Rs 4,500</div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">12</div>
                  <div className="text-sm text-muted-foreground">Expenses</div>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-semibold text-foreground mb-4">Top Spender</h3>
              <div className="flex items-center gap-3">
                <Avatar name="You" size="lg" />
                <div>
                  <div className="font-semibold">You</div>
                  <div className="text-sm text-muted-foreground">Rs 2,100 paid this month</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Settle Button */}
      <div className="fixed bottom-6 left-4 right-4">
        <Button className="w-full h-12 rounded-xl text-base font-semibold shadow-wallet">
          Settle Group
        </Button>
      </div>
    </div>
  );
};

export default GroupDetail;
