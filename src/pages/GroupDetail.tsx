import { useState, useMemo } from "react";
import { ArrowLeft, Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import TimelineItem from "@/components/TimelineItem";
import Avatar from "@/components/Avatar";
import { useNavigate, useParams } from "react-router-dom";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import MemberDetailSheet from "@/components/MemberDetailSheet";
import { toast } from "sonner";
import { Plus, HandCoins } from "lucide-react";
import { useData } from "@/contexts/DataContext";

const GroupDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getGroupById, getTransactionsByGroup, getTransactionsByMember, addExpense, recordPayment } = useData();
  
  const [activeTab, setActiveTab] = useState<"ledger" | "members" | "summary">("ledger");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string; balance: number; paymentDetails?: any; phone?: string } | null>(null);
  const [showMemberDetail, setShowMemberDetail] = useState(false);

  const group = id ? getGroupById(id) : undefined;
  const transactions = id ? getTransactionsByGroup(id) : [];

  // Get transactions between "You" and the selected member
  const memberTransactions = useMemo(() => {
    if (!group || !selectedMember) return [];
    
    const currentUser = group.members.find((m) => m.isCurrentUser);
    if (!currentUser) return [];
    
    return transactions
      .filter((t) => {
        if (t.type === "payment") {
          return (
            (t.from === selectedMember.id && t.to === currentUser.id) ||
            (t.from === currentUser.id && t.to === selectedMember.id)
          );
        }
        if (t.type === "expense") {
          const memberInvolved = t.participants?.some((p) => p.id === selectedMember.id);
          const youPaid = t.paidBy === currentUser.id;
          const memberPaid = t.paidBy === selectedMember.id;
          const youInvolved = t.participants?.some((p) => p.id === currentUser.id);
          
          return (youPaid && memberInvolved) || (memberPaid && youInvolved);
        }
        return false;
      })
      .map((t) => {
        let direction: "gave" | "received" = "received";
        
        if (t.type === "payment") {
          direction = t.from === selectedMember.id ? "received" : "gave";
        } else if (t.type === "expense") {
          const currentUser = group.members.find((m) => m.isCurrentUser);
          if (t.paidBy === currentUser?.id) {
            direction = "received";
          } else if (t.paidBy === selectedMember.id) {
            direction = "gave";
          }
        }
        
        let amount = t.amount;
        if (t.type === "expense") {
          const currentUser = group.members.find((m) => m.isCurrentUser);
          if (t.paidBy === currentUser?.id) {
            amount = t.participants?.find((p) => p.id === selectedMember.id)?.amount || 0;
          } else {
            amount = t.participants?.find((p) => p.id === currentUser?.id)?.amount || 0;
          }
        }
        
        return {
          id: t.id,
          type: t.type,
          title: t.title,
          amount,
          date: t.date,
          place: t.place,
          method: t.method,
          direction,
        };
      });
  }, [group, selectedMember, transactions]);

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
  const currentUser = group.members.find((m) => m.isCurrentUser);

  // Calculate total pending
  const totalPending = group.members.reduce((sum, m) => {
    if (!m.isCurrentUser && m.balance < 0) {
      return sum + Math.abs(m.balance);
    }
    return sum;
  }, 0);

  const handleMemberClick = (member: { id: string; name: string; balance: number; paymentDetails?: any; phone?: string }) => {
    if (member.id === currentUser?.id) return;
    setSelectedMember(member);
    setShowMemberDetail(true);
  };

  const handleExpenseSubmit = (data: {
    amount: number;
    paidBy: string;
    participants: string[];
    note: string;
    place: string;
  }) => {
    addExpense({
      groupId: group.id,
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
    if (!currentUser) return;
    
    recordPayment({
      groupId: group.id,
      fromMember: data.fromMember,
      toMember: currentUser.id,
      amount: data.amount,
      method: data.method,
      note: data.note,
    });
    
    const memberName = group.members.find((m) => m.id === data.fromMember)?.name;
    toast.success(`Recorded Rs ${data.amount} from ${memberName}`);
  };

  // Calculate summary data
  const totalSpent = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseCount = transactions.filter((t) => t.type === "expense").length;
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
                {group.members.length} members {totalPending > 0 && `• Rs ${totalPending.toLocaleString()} pending`}
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
            {transactions.length > 0 ? (
              transactions.map((item, index) => (
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
                    paidBy={item.type === "expense" ? item.paidByName : undefined}
                    participants={item.type === "expense" ? item.participants : undefined}
                    from={item.type === "payment" ? item.fromName : undefined}
                    to={item.type === "payment" ? item.toName : undefined}
                    method={item.type === "payment" ? item.method : undefined}
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
              const isYou = member.isCurrentUser;
              
              return (
                <button
                  key={member.id}
                  onClick={() => handleMemberClick(member)}
                  disabled={isYou}
                  className={`w-full bg-card rounded-xl p-4 shadow-card flex items-center gap-4 animate-slide-up text-left transition-all ${
                    !isYou ? "hover:shadow-card-hover active:scale-[0.98]" : ""
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Avatar name={member.name} size="lg" />
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{member.name}</div>
                    <div className={`text-sm ${isPositive ? "text-positive" : "text-negative"}`}>
                      {member.balance === 0
                        ? "settled up"
                        : isYou
                        ? isPositive
                          ? `will receive Rs ${member.balance}`
                          : `owes Rs ${Math.abs(member.balance)}`
                        : isPositive
                        ? `owes you Rs ${member.balance}`
                        : `you owe Rs ${Math.abs(member.balance)}`}
                    </div>
                  </div>
                  {!isYou && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
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
          className="flex-1 h-12 rounded-xl text-base font-semibold"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Add Expense Sheet */}
      <AddExpenseSheet
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        members={members}
        onSubmit={handleExpenseSubmit}
      />

      {/* Record Payment Sheet */}
      <RecordPaymentSheet
        open={showRecordPayment}
        onClose={() => setShowRecordPayment(false)}
        members={members}
        onSubmit={handlePaymentSubmit}
      />

      {/* Member Detail Sheet */}
      {selectedMember && (
        <MemberDetailSheet
          open={showMemberDetail}
          onClose={() => {
            setShowMemberDetail(false);
            setSelectedMember(null);
          }}
          member={{
            name: selectedMember.name,
            balance: selectedMember.balance,
            paymentDetails: selectedMember.paymentDetails,
            phone: selectedMember.phone,
          }}
          transactions={memberTransactions}
          onRecordPayment={() => {
            setShowMemberDetail(false);
            setShowRecordPayment(true);
          }}
        />
      )}
    </div>
  );
};

export default GroupDetail;
