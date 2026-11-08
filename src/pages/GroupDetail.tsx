import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Settings, ChevronRight, Plus, HandCoins, Users, Share2, Star } from "lucide-react";
import GroupPendingInvitations from "@/components/GroupPendingInvitations";
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
import GroupBudgetSheet from "@/components/enterprise/GroupBudgetSheet";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useInvitations } from "@/hooks/useInvitations";
import { respondInvitation } from "@/lib/api";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MobileHeader from "@/components/MobileHeader";
import GroupChat from "@/components/GroupChat";
import { FileText, FileSpreadsheet, Download, Target, AlertTriangle } from "lucide-react";
import { callSecureApi } from "@/lib/api";

const GroupDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { formatAmount, currencyCode } = useCurrency();
  const { getGroupById, fetchGroupDetail, getTransactionsByGroup, addExpense, recordPayment, payMyDebt, markPaymentAsPaid, addMemberToGroup, removeMemberFromGroup, updateGroup, deleteGroup, mergeMembers, updateGroupBudget } = useFirebaseData();
  const { getSettlements, user, toggleFavoriteGroup, getFavoriteGroups } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);

  const [activeTab, setActiveTab] = useState<"ledger" | "chat" | "members" | "summary">("ledger");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string; balance: number; paymentDetails?: any; phone?: string; isTemporary?: boolean; isOwner?: boolean; walletBalance?: number } | null>(null);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [showMemberSettlement, setShowMemberSettlement] = useState(false);
  const [settlementMember, setSettlementMember] = useState<{ id: string; name: string; avatar?: string; isTemporary?: boolean } | null>(null);
  const [showGroupGuide, setShowGroupGuide] = useState(false);
  const [fullGroup, setFullGroup] = useState<any>(null);
  const [isGroupLoading, setIsGroupLoading] = useState(true);
  const [showBudgetSheet, setShowBudgetSheet] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

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

  useEffect(() => {
    const loadGroupData = async () => {
      if (id) {
        setIsGroupLoading(true);
        const data = await fetchGroupDetail(id);
        setFullGroup(data);
        setIsGroupLoading(false);
      }
    };
    loadGroupData();
  }, [id, fetchGroupDetail]);

  // Sync partial group from context if it exists (for immediate name/emoji display)
  const partialGroup = id ? getGroupById(id) : undefined;
  const rawGroup = fullGroup || partialGroup;

  // Defensive: Ensure members is always an array (Firebase may return object)
  const group = rawGroup ? {
    ...rawGroup,
    members: (Array.isArray(rawGroup.members)
      ? rawGroup.members
      : Object.entries(rawGroup.members || {}).map(([key, value]: [string, any]) => ({ ...value, id: key }))
    ).filter((m: { id: any; }) => m && m.id) // Filter out any null/undefined members
  } : null;

  const transactions = id ? getTransactionsByGroup(id) : [];
  const settlements = id ? getSettlements(id) : {};
  const { invitations } = useInvitations();
  const favoriteGroups = getFavoriteGroups();
  const isFavorite = id && favoriteGroups.includes(id);

  // Calculate total amount to receive in this group
  const groupTotalToReceive = Object.values(settlements).reduce((total, settlement) => {
    return total + (settlement.toReceive || 0);
  }, 0);

  // NOTE: These useMemo hooks MUST be before the early returns below to maintain
  // consistent hook count across renders (React Rules of Hooks)
  const personalStats = useMemo(() => {
    if (!group?.isPersonal) return null;
    const totalSpentValue = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    return {
      totalSpent: totalSpentValue,
      count: transactions.filter(t => t.type === 'expense').length
    };
  }, [group, transactions]);

  const totalSpent = useMemo(() => transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0), [transactions]);

  const expenseCount = useMemo(() => transactions.filter((t) => t.type === "expense").length, [transactions]);

  // Get transactions between "You" and the selected member
  const memberTransactions = useMemo(() => {
    if (!group || !selectedMember) return [];

    const currentUser = group.members.find((m: { isCurrentUser: any; }) => m.isCurrentUser);
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

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    if (!group) return;
    const result = await toggleFavoriteGroup(group.id);
    if (!result.success) {
      toast.error("Failed to update favorite status");
    }
  };

  // Check for pending invitation
  // @ts-expect-error - Expected to violate hooks rule temporarily during refactor
  if (group && group.status === 'invited') {
    const invitation = invitations.find(i => i.groupId === group.id);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl">{group.emoji || "👋"}</span>
          </div>
          <h2 className="text-2xl font-black mb-2 text-gray-900">You're Invited!</h2>
          <p className="mb-8 text-gray-600">
            You have been invited to join <strong className="text-gray-900">{group.name}</strong>.
            {invitation && (
              <span className="block mt-2 text-sm text-gray-500">
                Invited by {invitation.invitedBy}
              </span>
            )}
          </p>
          <div className="flex gap-4 justify-center w-full">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-12"
              onClick={async () => {
                if (!invitation) return;
                try {
                  await respondInvitation(invitation.invitationId, false);
                  toast.success("Invitation declined");
                  navigate('/');
                } catch (e) {
                  toast.error("Failed to decline");
                }



              }}
              disabled={!invitation}
            >
              Decline
            </Button>
            <Button
              className="flex-1 rounded-xl h-12 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={async () => {
                if (!invitation) return;
                try {
                  const res = await respondInvitation(invitation.invitationId, true);
                  if (res.success) {
                    toast.success("Welcome to the group! 🎉");
                    // Reload to refresh permissions and state
                    window.location.reload();
                  } else {
                    toast.error(res.error || "Failed to join");
                  }
                } catch (e) {
                  toast.error("Failed to accept");
                }
              }}
              disabled={!invitation}
            >
              Accept Invitation
            </Button>
          </div>
        </div>
      </div>
    );
  }
  // @ts-expect-error - Expected to violate hooks rule temporarily during refactor
  if (!group && !isGroupLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('group.group_not_found')}</h2>
          <Button onClick={() => navigate("/")} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">{t('group.go_back')}</Button>
        </div>
      </div>
    );
  }

  // @ts-expect-error - Expected to violate hooks rule temporarily during refactor
  if (isGroupLoading && !partialGroup) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-bold text-gray-800">{t('group.loading_details')}</h2>
        <p className="text-gray-500 mt-2">{t('group.getting_balances')}</p>
      </div>
    );
  }

  const members = group.members.map((m: any) => ({
    id: m.id,
    name: m.name,
    isTemporary: m.isTemporary,
    deletionCondition: m.deletionCondition,
    expiresAt: m.expiresAt,
    email: (m as any).email,
    isPending: (m as any).isPending,
    userId: (m as any).userId,
  }));
  const currentUser = group.members.find((m: any) => m.isCurrentUser);

  // Calculate total pending using settlements
  const totalPending = group.members.reduce((sum: number, m: any) => {
    if (!m.isCurrentUser) {
      const settlement = settlements[m.id];
      // If settlement exists and you owe them (toPay > 0)
      if (settlement && settlement.toPay > 0) {
        return sum + settlement.toPay;
      }
    }
    return sum;
  }, 0);

  const handleMemberClick = (member: { id: string; name: string; balance: number; paymentDetails?: any; phone?: string; isTemporary?: boolean; isOwner?: boolean; walletBalance?: number }) => {
    if (member.id === currentUser?.id) return;
    setSelectedMember(member);
    setShowMemberDetail(true);
  };

  const handleExpenseSubmit = async (data: {
    groupId: string;
    amount: number;
    paidBy: string;
    payers?: { id: string; amount: number }[];
    participants: string[];
    note: string;
    place: string;
    location?: { lat: number; lng: number };
  }) => {
    try {
      // Members are now added immediately in AddExpenseSheet, so no need for staging replacements here
      const result = await addExpense({
        groupId: data.groupId,
        amount: data.amount,
        paidBy: data.paidBy,
        payers: data.payers,
        participants: data.participants,
        note: data.note,
        place: data.place,
        location: data.location,
      });

      if (result.success) {
        toast.success(`Added expense of ${formatAmount(data.amount)}`);
        if (result.transaction) {
          navigate("/receipt", { state: { transaction: result.transaction, type: "expense" } });
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
      const memberName = group.members.find((m: { id: string; }) => m.id === data.fromMember)?.name;
      toast.success(`Recorded ${formatAmount(data.amount)} from ${memberName}`);
      if (result.transaction) {
        navigate("/receipt", { state: { transaction: result.transaction, type: "payment" } });
      }
    } else {
      toast.error(result.error || "Failed to record payment");
    }
  };

  const handleExportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!id) return;
    
    setIsExporting(format);
    try {
      const response = await callSecureApi(`/api/export/group-report/${id}?format=${format}&currency=${currencyCode}`, {}, 'GET');
      
      // Handle raw Response object (Binary/Blob)
      if (response instanceof Response) {
        const blob = await response.blob();
        const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Determine extension
        let ext: string = format;
        if (format === 'excel') ext = 'xlsx';
        
        a.download = `Group-Report-${id}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Report exported as ${format.toUpperCase()}`);
        return;
      }

      if (response && response.downloadUrl) {
        // Direct download if URL is provided (legacy/JSON wrapper)
        window.open(response.downloadUrl, '_blank');
        toast.success(`Report exported as ${format.toUpperCase()}`);
      } else if (response && response.fileContent) {
        // Handle direct file content if provided as a string (legacy)
        const blob = new Blob([response.fileContent], { type: response.contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Group-Report-${id}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Report exported as ${format.toUpperCase()}`);
      } else {
        toast.error("Failed to generate report link");
      }
    } catch (error) {
      console.error(`Export ${format} error:`, error);
      toast.error(`Failed to export ${format.toUpperCase()} report`);
    } finally {
      setIsExporting(null);
    }
  };

  // Single group for this page
  const groupForSheet = [{
    id: group.id,
    name: group.name,
    emoji: group.emoji,
    members: members,
    createdBy: group.createdBy,
  }];

  // personalStats, totalSpent, and expenseCount are defined before early returns above

  // Find the member who has paid the most in expenses (actual top contributor)
  const topSpender = useMemo(() => {
    // @ts-expect-error - temporary
    if (!group?.members || !transactions.length) return null;

    // First pass: Calculate totals for each payer (O(T))
    const expenseTotals: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === "expense" && t.paidBy) {
        expenseTotals[t.paidBy] = (expenseTotals[t.paidBy] || 0) + t.amount;
      }
    }

    // Second pass: Find the member with the highest total (O(M))
    let max = -1;
    let top = null;
    for (const member of group.members) {
      const totalPaid = expenseTotals[member.id] || 0;
      if (totalPaid > max) {
        max = totalPaid;
        top = { ...member, totalPaid };
      }
    }
    return top;
  }, [group?.members, transactions]);

  return (
    <div className="min-h-screen bg-white pb-24">
      <MobileHeader
        title={group.name}
        showBackButton={true}
        rightContent={
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              className={cn(
                "w-10 h-10 rounded-full shadow-sm border flex items-center justify-center transition-all",
                isFavorite
                  ? "bg-yellow-100 border-yellow-200 text-yellow-500"
                  : "bg-[#4a6850]/10 border-[#4a6850]/20 text-[#4a6850] hover:bg-[#4a6850]/20"
              )}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={isFavorite}
            >
              <Star className={cn("w-5 h-5", isFavorite && "fill-current")} />
            </button>
            <button
              onClick={() => setShowGroupSettings(true)}
              className="w-10 h-10 rounded-full bg-[#4a6850]/10 shadow-sm border border-[#4a6850]/20 flex items-center justify-center hover:bg-[#4a6850]/20 transition-all"
            >
              <Settings className="w-5 h-5 text-[#4a6850] font-bold" />
            </button>
          </div>
        }
      />

      {/* Header - iPhone Style Enhanced */}
      <header className="sticky lg:top-0 top-[6.5rem] bg-white/95 backdrop-blur-xl z-40 border-b border-[#4a6850]/10 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
        <div className="px-4 py-5 hidden lg:block">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="w-11 h-11 rounded-2xl bg-[#4a6850]/10 shadow-sm border border-[#4a6850]/20 flex items-center justify-center hover:bg-[#4a6850]/20 transition-all"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-[#4a6850] font-bold" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{group.emoji}</span>
                <h1 className="text-xl font-black text-gray-900 tracking-tight truncate">{group.name}</h1>
              </div>
              <p className="text-xs text-[#4a6850]/80 font-bold mt-1">
                {group.memberCount || group.members.length} {t('group.member_count')} {totalPending > 0 && `• ${formatAmount(totalPending)} ${t('group.pending')}`}
              </p>
            </div>

            <button
              onClick={handleToggleFavorite}
              className={cn(
                "w-11 h-11 rounded-2xl shadow-sm border flex items-center justify-center transition-all",
                isFavorite
                  ? "bg-yellow-100 border-yellow-200 text-yellow-500"
                  : "bg-[#4a6850]/10 border-[#4a6850]/20 text-[#4a6850] hover:bg-[#4a6850]/20"
              )}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={isFavorite}
            >
              <Star className={cn("w-5 h-5", isFavorite && "fill-current")} />
            </button>

            <button
              onClick={() => setShowGroupSettings(true)}
              className="w-11 h-11 rounded-2xl bg-[#4a6850]/10 shadow-sm border border-[#4a6850]/20 flex items-center justify-center hover:bg-[#4a6850]/20 transition-all"
              aria-label="Group settings"
            >
              <Settings className="w-5 h-5 text-[#4a6850] font-bold" />
            </button>
          </div>
        </div>

        {/* Tabs - iPhone Style Enhanced - Only for multi-member groups */}
        {!group.isPersonal ? (
          <div className="flex gap-2 px-4 pb-4">
            {[
              { id: "ledger", label: t('group.tabs.ledger') },
              { id: "chat", label: t('group.tabs.chat') },
              { id: "members", label: t('group.tabs.members') },
              { id: "summary", label: t('group.tabs.summary') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 py-3 px-2 rounded-[32px] text-xs font-black transition-all duration-200 border-2 ${activeTab === tab.id
                  ? "bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white border-[#4a6850] shadow-[0_8px_24px_rgba(74,104,80,0.3)] scale-105"
                  : "bg-white/80 text-[#4a6850]/80 hover:bg-white border-[#4a6850]/10 hover:border-[#4a6850]/20 active:scale-95"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          /* Personal Stats Summary for Personal groups */
          personalStats && (
            <div className="px-4 pb-4">
              <div className="bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-[32px] p-6 text-white shadow-xl">
                <div className="text-xs font-black uppercase tracking-wider text-white/70 mb-1">{t('group.lifetime_spent')}</div>
                <div className="text-3xl font-black mb-1">{formatAmount(personalStats.totalSpent)}</div>
                <div className="text-xs font-bold text-white/60">
                  {t('group.expense_count_plural', { count: personalStats.count })}
                </div>
              </div>
            </div>
          )
        )}
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
                    className="animate-slide-up bg-white rounded-[32px] shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 overflow-hidden hover:shadow-[0_25px_80px_rgba(74,104,80,0.12)] transition-all"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <TimelineItem
                      type={item.type}
                      title={item.title}
                      amount={item.amount}
                      date={item.date}
                      id={item.id}
                      groupId={group.id}
                      payers={item.type === "expense" && item.payers ? item.payers.map(p => ({
                        ...p,
                        name: (() => {
                          if (p.id === user?.uid) return t('group.you_label');
                          if (p.id === group.createdBy) return t('group.owner');
                          const member = group.members.find(m => m.id === p.id);
                          return member?.name || p.name;
                        })()
                      })) : undefined}
                      paidBy={item.type === "expense" ? (
                        (() => {
                          // Use consistent naming logic
                          if (item.paidBy === user?.uid) return t('group.you_label');
                          if (item.paidBy === group.createdBy) return t('group.owner');
                          const member = group.members.find((m: { id: any; }) => m.id === item.paidBy);
                          return member?.name || item.paidByName;
                        })()
                      ) : undefined}
                      participants={item.type === "expense" ? item.participants?.filter(p => p && p.id).map(p => ({
                        ...p,
                        name: (() => {
                          if (p.id === user?.uid) return t('group.you_label'); // Your share
                          if (p.id === group.createdBy) return t('group.owner'); // Owner's share
                          const member = group.members.find((m: { id: any; }) => m.id === p.id); // Valid member name
                          return member?.name || p.name;
                        })()
                      })) : undefined}
                      from={item.type === "payment" ? item.fromName : undefined}
                      to={item.type === "payment" ? item.toName : undefined}
                      method={item.type === "payment" ? item.method : undefined}
                      userRole={item.type === "payment" ? (item.from === user?.uid || item.paidBy === user?.uid ? 'payer' : 'receiver') : undefined}
                      isPayerOwner={item.paidBy === group.createdBy}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-[32px] border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
                <div className="w-14 h-14 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-3xl flex items-center justify-center mx-auto mb-3 border border-[#4a6850]/20">
                  <Plus className="w-7 h-7 text-[#4a6850] font-bold" />
                </div>
                <h3 className="text-base font-black text-gray-900 mb-1.5 tracking-tight">{t('group.no_transactions')}</h3>
                <p className="text-[#4a6850]/80 text-xs font-bold mb-4">
                  {t('group.add_expense_started')}
                </p>
                <Button
                  onClick={() => setShowAddExpense(true)}
                  className="bg-[#4a6850]/10 hover:bg-[#4a6850]/20 text-[#4a6850] hover:text-[#3d5643] font-black rounded-2xl h-12 px-6 shadow-none border border-[#4a6850]/10 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('activity.add_first_expense')}
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="animate-fade-in h-full">
            <GroupChat groupId={id!} groupName={group.name} fullHeight={true} />
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-4 animate-fade-in">
            {/* Pending Invitations Section */}
            {id && <GroupPendingInvitations groupId={id} />}

            {group.members.map((member: { id: any; name: any; isTemporary: any; isPending: any; userId: any; }, index: number) => {
              const isYou = (member as any).isCurrentUser;

              // Get settlement data for this member
              const memberSettlement = settlements[member.id] || { toReceive: 0, toPay: 0 };
              const youOweThisMember = memberSettlement.toPay > 0;
              const thisMemberOwesYou = memberSettlement.toReceive > 0;
              const isSettled = memberSettlement.toReceive === 0 && memberSettlement.toPay === 0;

              const handleSettlementClick = () => {
                setSettlementMember({
                  id: member.id,
                  name: member.name,
                  avatar: undefined,
                  isTemporary: member.isTemporary,
                });
                setShowMemberSettlement(true);
              };

              return (
                <div
                  key={member.id}
                  className={`w-full bg-white rounded-[32px] p-5 animate-slide-up border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)] hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all group hover:scale-[1.01] active:scale-[0.99]`}
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
                          <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">{t('group.temp')}</span>
                        )}
                        {member.isPending && !isYou && (
                          <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-600 text-[10px] font-black uppercase tracking-wider">{t('common.pending')}</span>
                        )}
                        {(member.userId === group.createdBy || member.id === group.createdBy) && (
                          <span className="px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-700 border border-yellow-200 text-[10px] font-black uppercase tracking-wider">{t('group.owner')}</span>
                        )}
                      </div>
                      <div className="text-xs mt-1">
                        {isYou ? (
                          <span className="text-[#4a6850] font-black">{t('group.you_label')}</span>
                        ) : isSettled ? (
                          <span className="text-[#4a6850] font-black">✅ {t('group.all_settled')}</span>
                        ) : (
                          <div className="space-y-0.5">
                            {thisMemberOwesYou && (
                              <div className="text-[#4a6850] font-black">
                                {t('group.owes_you')} {formatAmount(memberSettlement.toReceive)}
                              </div>
                            )}
                            {youOweThisMember && (
                              <div className="text-red-500 font-black">
                                {t('group.you_owe')} {formatAmount(memberSettlement.toPay)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isYou && !isSettled && !member.isPending && (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleSettlementClick}
                          size="sm"
                          className="bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white text-xs hover:from-[#3d5643] hover:to-[#2f4336] font-black shadow-lg hover:shadow-xl transition-all rounded-[32px] h-9 px-4 active:scale-95"
                        >
                          {t('group.settle_up')}
                        </Button>
                      </div>
                    )}

                    {!isYou && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMemberClick({
                          ...member,
                          balance: (member as any).balance || 0,
                          isOwner: member.userId === group.createdBy || member.id === group.createdBy,
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
            <div className="bg-gradient-to-br from-[#4a6850] via-[#3d5643] to-[#4a6850] rounded-[32px] p-6 shadow-[0_25px_70px_rgba(74,104,80,0.4)] text-white border-t-2 border-[#5a7860]/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/25 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">💰</span>
                </div>
                <div>
                  <div className="text-xs text-white/90 font-black tracking-wide uppercase">{t('group.stats_title')}</div>
                  <div className="text-[10px] text-white/80 font-bold">{t('group.stats_overview')}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-black text-white mb-1.5 tracking-tighter tabular-nums drop-shadow-sm">
                    {formatAmount(totalSpent)}
                  </div>
                  <div className="text-xs text-white/90 font-bold">{t('group.total_spent')}</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white mb-1.5 tracking-tighter tabular-nums drop-shadow-sm">
                    {expenseCount}
                  </div>
                  <div className="text-xs text-white/90 font-bold">{t('group.expenses_count')}</div>
                </div>
              </div>
            </div>

            {/* Top Contributor Card - iPhone Style */}
            <div className="bg-white rounded-[32px] p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-2xl flex items-center justify-center">
                  <span className="text-base">🏆</span>
                </div>
                <h3 className="font-black text-gray-900 text-base tracking-tight">{t('group.top_contributor')}</h3>
              </div>
              <div className="flex items-center gap-4">
                {topSpender ? (
                  <>
                    <Avatar name={topSpender?.name || ""} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-gray-900 text-base mb-1 tracking-tight truncate">
                        {topSpender.isCurrentUser ? t('group.you_label') : topSpender.name}
                      </div>
                      <div className="text-xs text-[#4a6850] font-bold">
                        {topSpender.totalPaid > 0
                          ? t('group.paid_amount', { amount: formatAmount(topSpender.totalPaid) })
                          : t('group.no_expenses_paid')}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 text-center py-2">
                    <div className="animate-pulse bg-gray-200 h-10 w-10 rounded-full mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Members Overview Card - iPhone Style */}
            <div className="bg-white rounded-[32px] p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-2xl flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#4a6850] font-bold" />
                </div>
                <h3 className="font-black text-gray-900 text-base tracking-tight">{t('group.members_title')}</h3>
              </div>
              <div className="flex -space-x-3 mb-3">
                {group.members.slice(0, 5).map((member: { id: any; name: string; }) => (
                  <Avatar key={member.id} name={member.name || ""} size="md" />
                ))}
                {group.members.length > 5 && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 border-2 border-white flex items-center justify-center text-xs font-black text-[#4a6850] shadow-lg">
                    +{group.members.length - 5}
                  </div>
                )}
              </div>
              <div className="text-xs text-[#4a6850]/80 font-bold">
                {t('group.how_many_members', { count: group.members.length })}
              </div>
            </div>

            {/* Group Budget Card - New Premium Card */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 relative overflow-hidden group/budget">
              {/* Decorative Background Icon */}
              <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover/budget:scale-110 group-hover/budget:rotate-12 transition-all duration-700">
                <Target className="w-32 h-32 text-[#4a6850]" />
              </div>

              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#4a6850]/10 to-[#3d5643]/10 rounded-2xl flex items-center justify-center border border-[#4a6850]/10">
                    <Target className="w-5 h-5 text-[#4a6850]" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-base tracking-tight">Group Budget</h3>
                    <p className="text-[10px] text-[#4a6850]/60 font-bold uppercase tracking-wider">
                      {group.budget?.period || 'Monthly'} Planning
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowBudgetSheet(true)}
                  className="rounded-xl h-8 px-3 text-[#4a6850] hover:bg-[#4a6850]/10 font-black text-xs"
                >
                  Edit
                </Button>
              </div>

              {!group.budget || group.budget.amount === 0 ? (
                <div className="text-center py-4 relative z-10">
                  <p className="text-xs text-gray-500 font-medium mb-3">No budget set for this group yet.</p>
                  <Button 
                    onClick={() => setShowBudgetSheet(true)}
                    className="bg-[#4a6850] hover:bg-[#3d5643] text-white rounded-xl h-10 px-6 font-black text-sm transition-all active:scale-95"
                  >
                    Set Budget
                  </Button>
                </div>
              ) : (() => {
                const spent = totalSpent; // We can refine this to only current period spent later
                const limit = group.budget.amount;
                const percentage = Math.min(Math.round((spent / limit) * 100), 100);
                const isOver = spent > limit;
                const isWarning = percentage >= 80 && !isOver;

                return (
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-2xl font-black text-gray-900 tracking-tighter tabular-nums">
                          {formatAmount(spent)}
                          <span className="text-sm text-gray-400 font-bold ml-1">/ {formatAmount(limit)}</span>
                        </div>
                        <div className="text-xs text-[#4a6850]/70 font-bold mt-0.5">
                          {isOver ? 'Budget exceeded' : `${formatAmount(limit - spent)} remaining`}
                        </div>
                      </div>
                      <div className={cn(
                        "text-sm font-black tabular-nums",
                        isOver ? "text-red-500" : isWarning ? "text-orange-500" : "text-[#4a6850]"
                      )}>
                        {percentage}%
                      </div>
                    </div>

                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                      <div 
                        className={cn(
                          "h-full transition-all duration-1000 ease-out rounded-full",
                          isOver ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-gradient-to-r from-[#4a6850] to-[#3d5643]"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {isWarning && (
                      <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-2xl border border-orange-100 animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <p className="text-[10px] text-orange-700 font-black uppercase tracking-tight">
                          Budget Alert: 80% limit reached
                        </p>
                      </div>
                    )}
                    {isOver && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 rounded-2xl border border-red-100">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <p className="text-[10px] text-red-700 font-black uppercase tracking-tight">
                          Budget exceeded for this period
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Export Reports Card */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/10">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base tracking-tight">Export Reports</h3>
                  <p className="text-[10px] text-blue-600/60 font-bold uppercase tracking-wider">
                    Performance & History
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  disabled={isExporting !== null}
                  onClick={() => handleExportReport('pdf')}
                  className="flex-col h-20 rounded-2xl border-[#4a6850]/10 hover:bg-[#4a6850]/5 hover:border-[#4a6850]/30 transition-all gap-2"
                >
                  {isExporting === 'pdf' ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-tight">PDF</span>
                </Button>
                
                <Button
                  variant="outline"
                  disabled={isExporting !== null}
                  onClick={() => handleExportReport('excel')}
                  className="flex-col h-20 rounded-2xl border-[#4a6850]/10 hover:bg-[#4a6850]/5 hover:border-[#4a6850]/30 transition-all gap-2"
                >
                  {isExporting === 'excel' ? (
                    <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-tight">Excel</span>
                </Button>

                <Button
                  variant="outline"
                  disabled={isExporting !== null}
                  onClick={() => handleExportReport('csv')}
                  className="flex-col h-20 rounded-2xl border-[#4a6850]/10 hover:bg-[#4a6850]/5 hover:border-[#4a6850]/30 transition-all gap-2"
                >
                  {isExporting === 'csv' ? (
                    <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-5 h-5 bg-gray-100 rounded-lg flex items-center justify-center font-black text-[8px] text-gray-600">CSV</div>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-tight">CSV</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Buttons - Enhanced iPhone Style */}
      {activeTab !== "chat" && (
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
                {t('group.record_payment')}
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
                {t('group.add_expense')}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800">
              <p>Add a shared expense and split it among members</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

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
          return result;
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
            id: selectedMember.id,
            name: selectedMember.name,
            balance: selectedMember.balance,
            paymentDetails: selectedMember.paymentDetails,
            phone: selectedMember.phone,
            isTemporary: selectedMember.isTemporary,
            walletBalance: selectedMember.walletBalance,
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
              toast.success(`Paid ${formatAmount(amountYouOwe)} to ${selectedMember.name}`);
              setShowMemberDetail(false);
              setSelectedMember(null);
            }
          }}
          onMergeWithMe={async () => {
            if (!currentUser || !selectedMember) return;
            if (window.confirm(`Are you sure you want to merge "${selectedMember.name}" into your profile?\n\nThis will move all their transactions to you and delete this duplicate profile.\n\nThis action cannot be undone.`)) {
              const result = await mergeMembers(group.id, selectedMember.id, currentUser.id);
              if (result.success) {
                toast.success("Profiles merged successfully");
                setShowMemberDetail(false);
                setSelectedMember(null);
                // Reload group to reflect changes
                fetchGroupDetail(group.id);
              } else {
                toast.error(result.error || "Failed to merge profiles");
              }
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
          members: group.members.map(m => ({
            ...m,
            balance: (settlements[m.id]?.toReceive || 0) - (settlements[m.id]?.toPay || 0)
          })),
        }}
        isOwner={user?.uid === group.createdBy}
        onAddMember={async (memberData) => {
          const result = await addMemberToGroup(group.id, memberData);
          if (result.success) {
            toast.success(`Invitation sent to ${memberData.name}`);
            fetchGroupDetail(group.id);
          } else {
            toast.error(result.error || "Failed to add member");
          }
        }}
        onRemoveMember={async (memberId) => {
          const memberName = group.members.find((m) => m.id === memberId)?.name;
          const result = await removeMemberFromGroup(group.id, memberId);
          if (result.success) {
            toast.success(`Removed ${memberName} from the group`);
            fetchGroupDetail(group.id);
          } else {
            toast.error(result.error || "Failed to remove member");
          }
        }}
        onUpdateGroup={async (data) => {
          const result = await updateGroup(group.id, data);
          if (result.success) {
            toast.success("Group updated");
            fetchGroupDetail(group.id);
          } else {
            toast.error(result.error || "Failed to update group");
          }
        }}
        onDeleteGroup={async () => {
          const result = await deleteGroup(group.id);
          if (result.success) {
            toast.success("Group deleted");
            setShowGroupSettings(false);
            navigate("/");
          } else {
            toast.error(result.error || "Failed to delete group");
          }
        }}
        onLeaveGroup={async () => {
          if (!user) return;
          const result = await removeMemberFromGroup(group.id, currentUser?.id || user.uid);
          if (result.success) {
            toast.success("You have left the group");
            setShowGroupSettings(false);
            navigate("/");
          } else {
            toast.error(result.error || "Failed to leave group");
          }
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

      {/* Group Budget Sheet */}
      <GroupBudgetSheet
        open={showBudgetSheet}
        onClose={() => setShowBudgetSheet(false)}
        group={group}
        onUpdateBudget={async (budget) => {
          const result = await updateGroupBudget(group!.id, budget);
          if (result.success) {
            fetchGroupDetail(group!.id);
          }
          return result;
        }}
      />

    </div>
  );
};

export default GroupDetail;
