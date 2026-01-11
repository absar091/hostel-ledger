import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MetricCard from "@/components/enterprise/MetricCard";
import EnterpriseButton from "@/components/enterprise/EnterpriseButton";
import TransactionItem from "@/components/enterprise/TransactionItem";
import BottomNav from "@/components/BottomNav";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import CreateGroupSheet from "@/components/CreateGroupSheet";
import AddMoneySheet from "@/components/AddMoneySheet";
import PaymentConfirmationSheet from "@/components/PaymentConfirmationSheet";
import ErrorAlert from "@/components/ErrorAlert";
import SuccessAlert from "@/components/SuccessAlert";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import "@/styles/design-system.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, getWalletBalance, getSettlements, getTotalToReceive, getTotalToPay, getSettlementDelta } = useFirebaseAuth();
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

  // Calculate totals using new settlement system
  const walletBalance = getWalletBalance();
  const settlementDelta = getSettlementDelta();
  const totalToReceive = getTotalToReceive();
  const totalToPay = getTotalToPay();

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
        let personName = "Unknown Member";
        let groupId = "";
        
        groups.forEach(group => {
          const member = group.members.find(m => m.id === personId);
          if (member && member.name) {
            personName = member.name;
            groupId = group.id;
          }
        });
        
        // Only add if we have a valid amount and name
        if (settlement.toPay > 0 && personName !== "Unknown Member") {
          owedMembers.push({
            id: personId,
            name: personName,
            amount: settlement.toPay,
            groupId: groupId
          });
        }
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
    <div className="min-h-screen bg-bg-app pb-24">
      {/* Header Section */}
      <header className="px-4 pt-8 pb-4">
        <div className="mb-4">
          <div className="text-caption text-text-secondary">{getGreeting()}</div>
          <h1 className="text-heading-l text-text-primary">{user?.name || "User"}</h1>
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
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-4">
        {/* Available Budget - Primary Metric */}
        <MetricCard
          label="Available Budget"
          amount={walletBalance}
          helperText="Actual money you have right now"
          variant="default"
          size="large"
        />

        {/* Settlement Delta */}
        <MetricCard
          label="Settlement Delta"
          amount={settlementDelta}
          helperText="Pending group settlements"
          variant={settlementDelta !== 0 ? "neutral" : "default"}
          size="medium"
        />

        {/* Receive / Owe Grid */}
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="You'll Receive"
            amount={totalToReceive}
            helperText="Money others owe you"
            variant="positive"
            size="medium"
          />
          <MetricCard
            label="You Owe"
            amount={totalToPay}
            helperText="Money you need to pay"
            variant="negative"
            size="medium"
          />
        </div>

        {/* Action Buttons Row */}
        <div className="flex gap-3">
          <EnterpriseButton
            variant="primary"
            onClick={handleAddExpense}
            className="flex-1"
          >
            Add Expense
          </EnterpriseButton>
          <EnterpriseButton
            variant="secondary"
            onClick={handleReceivedMoney}
            className="flex-1"
          >
            Received
          </EnterpriseButton>
          <EnterpriseButton
            variant="secondary"
            onClick={handleNewGroup}
            className="flex-1"
          >
            New Group
          </EnterpriseButton>
        </div>

        {/* Recent Transactions */}
        <div className="mt-6">
          <h2 className="text-heading-m text-text-primary mb-4">Recent Transactions</h2>
          
          {allTransactions.length > 0 ? (
            <div className="bg-bg-card border border-border-subtle rounded-card overflow-hidden">
              {allTransactions.slice(0, 5).map((transaction, index) => (
                <TransactionItem
                  key={transaction.id}
                  title={transaction.title}
                  metaLine1={`${transaction.date} • ${transaction.type}`}
                  metaLine2={transaction.type === "expense" ? `Paid by ${transaction.paidByName}` : 
                           transaction.type === "payment" ? `${transaction.fromName} → ${transaction.toName}` : undefined}
                  amount={transaction.amount}
                  isLast={index === Math.min(allTransactions.length, 5) - 1}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-text-muted text-body mb-4">No transactions yet</div>
              <EnterpriseButton
                variant="secondary"
                onClick={groups.length === 0 ? handleNewGroup : handleAddExpense}
              >
                {groups.length === 0 ? "Create your first group" : "Add your first expense"}
              </EnterpriseButton>
            </div>
          )}
        </div>
      </main>

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
