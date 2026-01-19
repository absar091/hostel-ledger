import { useState, useMemo } from "react";
import { ArrowLeft, Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import TimelineItem from "@/components/TimelineItem";
import Avatar from "@/components/Avatar";
import { useNavigate, useParams } from "react-router-dom";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import MemberDetailSheet from "@/components/MemberDetailSheet";
import MemberSettlementSheet from "@/components/MemberSettlementSheet";
import GroupSettingsSheet from "@/components/GroupSettingsSheet";
import { toast } from "sonner";
import { Plus, HandCoins } from "lucide-react";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GroupDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getGroupById, getTransactionsByGroup, addExpense, recordPayment, payMyDebt, markPaymentAsPaid, addMemberToGroup, removeMemberFromGroup, updateGroup, deleteGroup } = useFirebaseData();
  const { getSettlements } = useFirebaseAuth();
  
  const [activeTab, setActiveTab] = useState<"ledger" | "members" | "summary">("ledger");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string; balance: number; paymentDetails?: any; phone?: string } | null>(null);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [showMemberSettlement, setShowMemberSettlement] = useState(false);
  const [settlementMember, setSettlementMember] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  
  const group = id ? getGroupById(id) : undefined;
  const transactions = id ? getTransactionsByGroup(id) : [];
  const settlements = id ? getSettlements(id) : {};

  // Get transactions between "You" and the selected member
  const memberTransactions = useMemo(() => {
    if (!group || !selectedMember) return [];
    
    const currentUser = group.members.find((m) => m.isCurrentUser);
    if (!currentUser) return [];
    
    return transactions
      .filter((t) => {
        if (t.type === "payment") {
          // Only show payments directly between current user and selected member
          return (
            (t.from === selectedMember.id && t.to === currentUser.id) ||
            (t.from === currentUser.id && t.to === selectedMember.id)
          );
        }
        if (t.type === "expense") {
          // Only show expenses where both current user and selected member were involved
          const memberInvolved = t.participants?.some((p) => p.id === selectedMember.id);
          const youInvolved = t.participants?.some((p) => p.id === currentUser.id);
          
          // Must involve both parties (either as payer or participant)
          const bothInvolved = memberInvolved && youInvolved;
          const memberPaidForYou = t.paidBy === selectedMember.id && youInvolved;
          const youPaidForMember = t.paidBy === currentUser.id && memberInvolved;
          
          return bothInvolved || memberPaidForYou || youPaidForMember;
        }
        return false;
      })
      .map((t) => {
        let direction: "gave" | "received" = "received";
        let balanceChange = 0; // positive = they owe you more, negative = you owe them more
        
        if (t.type === "payment") {
          if (t.from === selectedMember.id && t.to === currentUser.id) {
            // They paid you - they owe you less now
            direction = "received";
            balanceChange = -t.amount; // Negative because they owe you LESS after paying
          } else if (t.from === currentUser.id && t.to === selectedMember.id) {
            // You paid them - you owe them less now
            direction = "gave";
            balanceChange = t.amount; // Positive because you owe them LESS (your debt decreases)
          }
        } else if (t.type === "expense") {
          if (t.paidBy === currentUser.id) {
            // You paid, they owe you their share
            direction = "received";
            const theirShare = t.participants?.find((p) => p.id === selectedMember.id)?.amount || 0;
            balanceChange = theirShare; // They owe you more
          } else if (t.paidBy === selectedMember.id) {
            // They paid, you owe them your share
            direction = "gave";
            const yourShare = t.participants?.find((p) => p.id === currentUser.id)?.amount || 0;
            balanceChange = -yourShare; // You owe them more
          }
        }
        
        // Calculate display amount based on transaction type
        let amount = t.amount;
        if (t.type === "expense") {
          if (t.paidBy === currentUser.id) {
            // Show their share when you paid
            amount = t.participants?.find((p) => p.id === selectedMember.id)?.amount || 0;
          } else if (t.paidBy === selectedMember.id) {
            // Show your share when they paid
            amount = t.participants?.find((p) => p.id === currentUser.id)?.amount || 0;
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
          balanceChange,
        };
      });
  }, [group, selectedMember, transactions]);

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Group not found</h2>
          <Button onClick={() => navigate("/")} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">Go Back</Button>
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
    groupId: string;
    amount: number;
    paidBy: string;
    participants: string[];
    note: string;
    place: string;
  }) => {
    addExpense({
      groupId: data.groupId,
      amount: data.amount,
      paidBy: data.paidBy,
      participants: data.participants,
      note: data.note,
      place: data.place,
    });
    toast.success(`Added expense of Rs ${data.amount}`);
  };

  const handlePaymentSubmit = (data: {
    groupId: string;
    fromMember: string;
    amount: number;
    method: "cash" | "online";
    note: string;
  }) => {
    if (!currentUser) return;
    
    recordPayment({
      groupId: data.groupId,
      fromMember: data.fromMember,
      toMember: currentUser.id,
      amount: data.amount,
      method: data.method,
      note: data.note,
    });
    
    const memberName = group.members.find((m) => m.id === data.fromMember)?.name;
    toast.success(`Recorded Rs ${data.amount} from ${memberName}`);
  };

  // Single group for this page
  const groupForSheet = [{
    id: group.id,
    name: group.name,
    emoji: group.emoji,
    members: members,
  }];

  // Calculate summary data
  const totalSpent = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseCount = transactions.filter((t) => t.type === "expense").length;
  const topSpender = group.members.reduce((prev, curr) => {
    const prevBalance = prev.balance || 0;
    const currBalance = curr.balance || 0;
    return currBalance > prevBalance ? curr : prev;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 border-b border-gray-100 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{group.emoji}</span>
                <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
              </div>
              <p className="text-sm text-gray-500">
                {group.members.length} members {totalPending > 0 && `• Rs ${totalPending.toLocaleString()} pending`}
              </p>
            </div>
            
            <button 
              onClick={() => setShowGroupSettings(true)}
              className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-700" />
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
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                  : "bg-white/70 text-gray-600 hover:bg-white border border-gray-100"
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
              <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <Plus className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-500 text-sm">
                  Add an expense to get started
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-3 animate-fade-in">
            {group.members.map((member, index) => {
              const isYou = member.isCurrentUser;
              
              // Get settlement data for this member
              const memberSettlement = settlements[member.id] || { toReceive: 0, toPay: 0 };
              const youOweThisMember = memberSettlement.toPay > 0;
              const thisMemberOwesYou = memberSettlement.toReceive > 0;
              const isSettled = memberSettlement.toReceive === 0 && memberSettlement.toPay === 0;
              
              const handleSettlementClick = () => {
                setSettlementMember({
                  id: member.id,
                  name: member.name,
                });
                setShowMemberSettlement(true);
              };
              
              return (
                <div
                  key={member.id}
                  className={`w-full bg-white/70 backdrop-blur-sm rounded-2xl p-4 animate-slide-up border border-white/50 shadow-sm hover:bg-white/90 transition-colors`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={member.name} size="lg" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500">
                        {isYou ? (
                          "You"
                        ) : isSettled ? (
                          "✅ All settled"
                        ) : (
                          <div className="space-y-1">
                            {thisMemberOwesYou && (
                              <div className="text-emerald-600">
                                Owes you Rs {memberSettlement.toReceive.toLocaleString()}
                              </div>
                            )}
                            {youOweThisMember && (
                              <div className="text-red-500">
                                You owe Rs {memberSettlement.toPay.toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {!isYou && !isSettled && (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleSettlementClick}
                          size="sm"
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs hover:from-emerald-600 hover:to-teal-600"
                        >
                          Settle Up
                        </Button>
                      </div>
                    )}
                    
                    {!isYou && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMemberClick({
                          ...member,
                          balance: member.balance || 0
                        })}
                        className="p-2 hover:bg-gray-100"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "summary" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-lg">
              <h3 className="font-semibold text-white/90 mb-4">Group Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-white">Rs {totalSpent.toLocaleString()}</div>
                  <div className="text-sm text-white/70">Total Spent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{expenseCount}</div>
                  <div className="text-sm text-white/70">Expenses</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
              <h3 className="font-semibold text-gray-900 mb-4">Top Contributor</h3>
              <div className="flex items-center gap-3">
                <Avatar name={topSpender.name} size="lg" />
                <div>
                  <div className="font-semibold text-gray-900">{topSpender.name}</div>
                  <div className="text-sm text-emerald-600">
                    {(topSpender.balance || 0) >= 0 
                      ? `Rs ${(topSpender.balance || 0).toLocaleString()} to receive` 
                      : `Rs ${Math.abs(topSpender.balance || 0).toLocaleString()} owes`}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
              <h3 className="font-semibold text-gray-900 mb-4">Members</h3>
              <div className="flex -space-x-2">
                {group.members.slice(0, 5).map((member) => (
                  <Avatar key={member.id} name={member.name} size="md" />
                ))}
                {group.members.length > 5 && (
                  <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-sm font-medium text-gray-600">
                    +{group.members.length - 5}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                {group.members.length} members in this group
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Buttons */}
      <TooltipProvider delayDuration={300}>
        <div className="fixed bottom-6 left-4 right-4 flex gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => setShowRecordPayment(true)}
                variant="outline"
                className="flex-1 h-12 rounded-xl text-base font-semibold"
              >
                <HandCoins className="w-5 h-5 mr-2" />
                Record Payment
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800">
              <p>Record money received from a member to settle their debt</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => setShowAddExpense(true)}
                className="flex-1 h-12 rounded-xl text-base font-semibold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Expense
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800">
              <p>Add a shared expense and split it among members</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Add Expense Sheet */}
      <AddExpenseSheet
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        groups={groupForSheet}
        onSubmit={handleExpenseSubmit}
      />

      {/* Record Payment Sheet */}
      <RecordPaymentSheet
        open={showRecordPayment}
        onClose={() => setShowRecordPayment(false)}
        groups={groupForSheet}
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
          settlementInfo={{
            theyOweYou: settlements[selectedMember.id]?.toReceive || 0,
            youOweThem: settlements[selectedMember.id]?.toPay || 0,
          }}
          onRecordPayment={() => {
            setShowMemberDetail(false);
            setShowRecordPayment(true);
          }}
          onPayToMember={() => {
            // Pay your debt to this member
            if (!currentUser || !selectedMember) return;
            const amountYouOwe = settlements[selectedMember.id]?.toPay || 0;
            if (amountYouOwe > 0) {
              payMyDebt(group.id, selectedMember.id, amountYouOwe);
              toast.success(`Paid Rs ${amountYouOwe} to ${selectedMember.name}`);
              setShowMemberDetail(false);
              setSelectedMember(null);
            }
          }}
        />
      )}

      {/* Group Settings Sheet */}
      <GroupSettingsSheet
        open={showGroupSettings}
        onClose={() => setShowGroupSettings(false)}
        group={{
          id: group.id,
          name: group.name,
          emoji: group.emoji,
          members: group.members,
        }}
        onAddMember={(name) => {
          addMemberToGroup(group.id, { name });
          toast.success(`Added ${name} to the group`);
        }}
        onRemoveMember={(memberId) => {
          const memberName = group.members.find((m) => m.id === memberId)?.name;
          removeMemberFromGroup(group.id, memberId);
          toast.success(`Removed ${memberName} from the group`);
        }}
        onUpdateGroup={(data) => {
          updateGroup(group.id, data);
          toast.success("Group updated");
        }}
        onDeleteGroup={() => {
          deleteGroup(group.id);
          toast.success("Group deleted");
          navigate("/");
        }}
      />

      {/* Member Settlement Sheet */}
      {settlementMember && group && (
        <MemberSettlementSheet
          open={showMemberSettlement}
          onClose={() => {
            setShowMemberSettlement(false);
            setSettlementMember(null);
          }}
          member={settlementMember}
          groupId={group.id}
        />
      )}
    </div>
  );
};

export default GroupDetail;
