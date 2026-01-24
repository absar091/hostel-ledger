import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Settings, ChevronRight, Plus, HandCoins, Users, Share2 } from "lucide-react";
import TransactionSuccessSheet from "@/components/TransactionSuccessSheet";
import { Button } from "@/components/ui/button";
import TimelineItem from "@/components/TimelineItem";
import Avatar from "@/components/Avatar";
import PageGuide from "@/components/PageGuide";
import { useNavigate, useParams } from "react-router-dom";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import MemberDetailSheet from "@/components/MemberDetailSheet";
import MemberSettlementSheet from "@/components/MemberSettlementSheet";
import GroupSettingsSheet from "@/components/GroupSettingsSheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GroupDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getGroupById, getTransactionsByGroup, addExpense, recordPayment, payMyDebt, markPaymentAsPaid, addMemberToGroup, removeMemberFromGroup, updateGroup, deleteGroup } = useFirebaseData();
  const { getSettlements, user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);

  const [activeTab, setActiveTab] = useState<"ledger" | "members" | "summary">("ledger");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string; balance: number; paymentDetails?: any; phone?: string; isTemporary?: boolean } | null>(null);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [showMemberSettlement, setShowMemberSettlement] = useState(false);
  const [settlementMember, setSettlementMember] = useState<{ id: string; name: string; avatar?: string; isTemporary?: boolean } | null>(null);
  const [showGroupGuide, setShowGroupGuide] = useState(false);

  // Success Sheet states
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [successTransaction, setSuccessTransaction] = useState<any>(null);
  const [successType, setSuccessType] = useState<"expense" | "payment">("expense");

  // Check if we should show page guide
  useEffect(() => {
    if (shouldShowPageGuide('group-detail')) {
      setShowGroupGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleGroupGuideClose = () => {
    setShowGroupGuide(false);
    markPageGuideShown('group-detail');
  };

  const group = id ? getGroupById(id) : undefined;
  const transactions = id ? getTransactionsByGroup(id) : [];
  const settlements = id ? getSettlements(id) : {};

  // Calculate total amount to receive in this group
  const groupTotalToReceive = Object.values(settlements).reduce((total, settlement) => {
    return total + (settlement.toReceive || 0);
  }, 0);

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        {/* iPhone-style top accent border */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>

        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Group not found</h2>
          <Button onClick={() => navigate("/")} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">Go Back</Button>
        </div>
      </div>
    );
  }

  const members = group.members.map((m) => ({
    id: m.id,
    name: m.name,
    isTemporary: m.isTemporary,
    deletionCondition: m.deletionCondition,
    expiresAt: m.expiresAt
  }));
  const currentUser = group.members.find((m) => m.isCurrentUser);

  // Calculate total pending
  const totalPending = group.members.reduce((sum, m) => {
    if (!m.isCurrentUser && m.balance < 0) {
      return sum + Math.abs(m.balance);
    }
    return sum;
  }, 0);

  const handleMemberClick = (member: { id: string; name: string; balance: number; paymentDetails?: any; phone?: string; isTemporary?: boolean }) => {
    if (member.id === currentUser?.id) return;
    setSelectedMember(member);
    setShowMemberDetail(true);
  };

  const handleExpenseSubmit = async (data: {
    groupId: string;
    amount: number;
    paidBy: string;
    participants: string[];
    note: string;
    place: string;
    stagedMembers?: any[];
  }) => {
    try {
      // Step 1: Create any staged (temporary) members first
      let updatedParticipants = [...data.participants];
      let updatedPaidBy = data.paidBy;

      if (data.stagedMembers && data.stagedMembers.length > 0) {
        for (const staged of data.stagedMembers) {
          const createResult = await addMemberToGroup(data.groupId, {
            name: staged.name,
            isTemporary: true,
            deletionCondition: staged.deletionCondition
          });

          if (createResult.success && createResult.memberId) {
            // Replace the staged ID with the real ID in participants
            updatedParticipants = updatedParticipants.map(id => id === staged.id ? createResult.memberId! : id);
            // If the staged member was the payer, update paidBy too
            if (updatedPaidBy === staged.id) {
              updatedPaidBy = createResult.memberId!;
            }
          } else {
            toast.error(`Failed to create member ${staged.name}. Expense might split incorrectly.`);
          }
        }
      }

      // Step 2: Add the expense with real member IDs
      const result = await addExpense({
        groupId: data.groupId,
        amount: data.amount,
        paidBy: updatedPaidBy,
        participants: updatedParticipants,
        note: data.note,
        place: data.place,
      });

      if (result.success) {
        toast.success(`Added expense of Rs ${data.amount.toLocaleString()}`);
        if (result.transaction) {
          setSuccessTransaction(result.transaction);
          setSuccessType("expense");
          setShowSuccessSheet(true);
        }
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
    if (!currentUser) return;

    const result = await recordPayment({
      groupId: data.groupId,
      fromMember: data.fromMember,
      toMember: currentUser.id,
      amount: data.amount,
      method: data.method,
      note: data.note,
    });

    if (result.success) {
      const memberName = group.members.find((m) => m.id === data.fromMember)?.name;
      toast.success(`Recorded Rs ${data.amount} from ${memberName}`);
      if (result.transaction) {
        setSuccessTransaction(result.transaction);
        setSuccessType("payment");
        setShowSuccessSheet(true);
      }
    } else {
      toast.error(result.error || "Failed to record payment");
    }
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

  // Find the member who has paid the most in expenses (actual top contributor)
  const memberExpenseContributions = group.members.map(member => {
    const totalPaid = transactions
      .filter(t => t.type === "expense" && t.paidBy === member.id)
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      ...member,
      totalPaid
    };
  });

  const topSpender = memberExpenseContributions.reduce((prev, curr) => {
    return curr.totalPaid > prev.totalPaid ? curr : prev;
  });

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* iPhone-style top accent border */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>

      {/* Header - iPhone Style Enhanced */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-xl z-50 border-b border-[#4a6850]/10 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
        <div className="px-4 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="w-11 h-11 rounded-2xl bg-[#4a6850]/10 shadow-sm border border-[#4a6850]/20 flex items-center justify-center hover:bg-[#4a6850]/20 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-[#4a6850] font-bold" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{group.emoji}</span>
                <h1 className="text-xl font-black text-gray-900 tracking-tight truncate">{group.name}</h1>
              </div>
              <p className="text-xs text-[#4a6850]/80 font-bold mt-1">
                {group.members.length} members {totalPending > 0 && `• Rs ${totalPending.toLocaleString()} pending`}
              </p>
            </div>

            <button
              onClick={() => setShowGroupSettings(true)}
              className="w-11 h-11 rounded-2xl bg-[#4a6850]/10 shadow-sm border border-[#4a6850]/20 flex items-center justify-center hover:bg-[#4a6850]/20 transition-all"
            >
              <Settings className="w-5 h-5 text-[#4a6850] font-bold" />
            </button>
          </div>
        </div>

        {/* Tabs - iPhone Style Enhanced */}
        <div className="flex gap-2 px-4 pb-4">
          {[
            { id: "ledger", label: "Ledger" },
            { id: "members", label: "Members" },
            { id: "summary", label: "Summary" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-3 px-4 rounded-2xl text-sm font-black transition-all duration-200 ${activeTab === tab.id
                ? "bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white shadow-[0_8px_32px_rgba(74,104,80,0.3)] scale-105"
                : "bg-white/80 text-[#4a6850]/80 hover:bg-white border border-[#4a6850]/10 hover:scale-102"
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
              <div className="space-y-3">
                {transactions.map((item, index) => (
                  <div
                    key={item.id}
                    className="animate-slide-up bg-white rounded-3xl shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 overflow-hidden"
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
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
                <div className="w-14 h-14 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-3xl flex items-center justify-center mx-auto mb-3 border border-[#4a6850]/20">
                  <Plus className="w-7 h-7 text-[#4a6850] font-bold" />
                </div>
                <h3 className="text-base font-black text-gray-900 mb-1.5 tracking-tight">No transactions yet</h3>
                <p className="text-[#4a6850]/80 text-xs font-bold">
                  Add an expense to get started
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-4 animate-fade-in">
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
                  isTemporary: member.isTemporary,
                });
                setShowMemberSettlement(true);
              };

              return (
                <div
                  key={member.id}
                  className={`w-full bg-white rounded-3xl p-5 animate-slide-up border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)] hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all group`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar name={member.name} size="lg" />
                      {isYou && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-black text-gray-900 tracking-tight text-base">{member.name}</div>
                        {member.isTemporary && (
                          <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">Temp</span>
                        )}
                      </div>
                      <div className="text-xs mt-1">
                        {isYou ? (
                          <span className="text-[#4a6850] font-black">You</span>
                        ) : isSettled ? (
                          <span className="text-[#4a6850] font-black">✅ All settled</span>
                        ) : (
                          <div className="space-y-0.5">
                            {thisMemberOwesYou && (
                              <div className="text-[#4a6850] font-black">
                                Owes you Rs {memberSettlement.toReceive.toLocaleString()}
                              </div>
                            )}
                            {youOweThisMember && (
                              <div className="text-red-500 font-black">
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
                          className="bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white text-xs hover:from-[#3d5643] hover:to-[#2f4336] font-black shadow-lg hover:shadow-xl transition-all"
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
                        className="p-3 hover:bg-[#4a6850]/10 rounded-2xl group-hover:scale-105 transition-all"
                      >
                        <ChevronRight className="w-5 h-5 text-[#4a6850]/60 group-hover:text-[#4a6850]" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "summary" && (
          <div className="space-y-6 animate-fade-in">
            {/* Total Spent Card - iPhone Style */}
            <div className="bg-gradient-to-br from-[#4a6850] via-[#3d5643] to-[#4a6850] rounded-3xl p-6 shadow-[0_25px_70px_rgba(74,104,80,0.4)] text-white border-t-2 border-[#5a7860]/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/25 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">💰</span>
                </div>
                <div>
                  <div className="text-xs text-white/90 font-black tracking-wide uppercase">Group Stats</div>
                  <div className="text-[10px] text-white/80 font-bold">Total activity overview</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-black text-white mb-1.5 tracking-tighter tabular-nums drop-shadow-sm">
                    Rs {totalSpent.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/90 font-bold">Total Spent</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white mb-1.5 tracking-tighter tabular-nums drop-shadow-sm">
                    {expenseCount}
                  </div>
                  <div className="text-xs text-white/90 font-bold">Expenses</div>
                </div>
              </div>
            </div>

            {/* Top Contributor Card - iPhone Style */}
            <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-2xl flex items-center justify-center">
                  <span className="text-base">🏆</span>
                </div>
                <h3 className="font-black text-gray-900 text-base tracking-tight">Top Contributor</h3>
              </div>
              <div className="flex items-center gap-4">
                <Avatar name={topSpender.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-black text-gray-900 text-base mb-1 tracking-tight truncate">{topSpender.name}</div>
                  <div className="text-xs text-[#4a6850] font-bold">
                    {topSpender.totalPaid > 0
                      ? `Paid Rs ${topSpender.totalPaid.toLocaleString()} in expenses`
                      : `No expenses paid yet`}
                  </div>
                </div>
              </div>
            </div>

            {/* Members Overview Card - iPhone Style */}
            <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-2xl flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#4a6850] font-bold" />
                </div>
                <h3 className="font-black text-gray-900 text-base tracking-tight">Members</h3>
              </div>
              <div className="flex -space-x-3 mb-3">
                {group.members.slice(0, 5).map((member) => (
                  <Avatar key={member.id} name={member.name} size="md" />
                ))}
                {group.members.length > 5 && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 border-2 border-white flex items-center justify-center text-xs font-black text-[#4a6850] shadow-lg">
                    +{group.members.length - 5}
                  </div>
                )}
              </div>
              <div className="text-xs text-[#4a6850]/80 font-bold">
                {group.members.length} members in this group
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Buttons - Enhanced iPhone Style */}
      <div className="fixed bottom-4 left-4 right-4 flex gap-4 z-40 pb-safe">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setShowRecordPayment(true)}
              disabled={groupTotalToReceive <= 0}
              variant="outline"
              className={cn(
                "flex-1 h-12 rounded-2xl text-sm font-black transition-all shadow-[0_8px_32px_rgba(74,104,80,0.15)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.25)]",
                groupTotalToReceive <= 0
                  ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-70"
                  : "bg-white border-[#4a6850]/30 text-[#4a6850] hover:bg-[#4a6850]/10 hover:border-[#4a6850]/50"
              )}
            >
              <HandCoins className="w-4 h-4 mr-2 font-bold" />
              Record Payment
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800">
            <p>
              {groupTotalToReceive <= 0
                ? 'No pending payments in this group. Nobody owes you money here.'
                : 'Record money received from a member to settle their debt'
              }
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setShowAddExpense(true)}
              className="flex-1 h-12 rounded-2xl text-sm font-black bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4336] text-white shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all border-t-2 border-[#5a7860]/40"
            >
              <Plus className="w-4 h-4 mr-2 font-bold" />
              Add Expense
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800">
            <p>Add a shared expense and split it among members</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Add Expense Sheet */}
      <AddExpenseSheet
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        groups={groupForSheet}
        onSubmit={handleExpenseSubmit}
        onAddMember={async (groupId, data) => {
          const result = await addMemberToGroup(groupId, data);
          if (result.success) {
            toast.success(`Added temporary member: ${data.name}`);
          } else {
            toast.error(result.error || "Failed to add member");
          }
        }}
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
            isTemporary: selectedMember.isTemporary,
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

      {/* Group Detail Page Guide */}
      <PageGuide
        title="Group Management"
        description="This is your group's control center. View expenses, manage members, and track who owes what to whom."
        tips={[
          "Switch between Ledger, Members, and Summary tabs",
          "Tap + to add new expenses to this group",
          "Tap on members to see payment details or settle debts"
        ]}
        emoji="🏢"
        show={showGroupGuide}
        onClose={handleGroupGuideClose}
      />

      <TransactionSuccessSheet
        open={showSuccessSheet}
        onClose={() => {
          setShowSuccessSheet(false);
          setSuccessTransaction(null);
        }}
        transaction={successTransaction}
        type={successType}
      />
    </div>
  );
};

export default GroupDetail;
