import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronRight, AlertCircle, WifiOff, UserPlus, Clock, Ban, Wallet } from "lucide-react";
import Avatar from "./Avatar";
import Tooltip from "./Tooltip";
import { cn } from "@/lib/utils";
import { saveOfflineExpense } from "@/lib/offlineDB";
import { useSync } from "@/hooks/useSync";
import { toast } from "sonner";
import { calculateExpenseSplit } from "@/lib/expenseLogic";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getDatabase, ref, get } from "firebase/database";
import { useTranslation } from "react-i18next";
// import { validateExpenseData, sanitizeString, sanitizeAmount } from "@/lib/validation";

interface Member {
  id: string;
  name: string;
  isTemporary?: boolean;
  deletionCondition?: 'SETTLED' | 'TIME_LIMIT' | null;
  expiresAt?: number | null;
  isPending?: boolean;
  isCurrentUser?: boolean;
  balance?: number; // Wallet balance if shared
}

interface Group {
  id: string;
  name: string;
  emoji: string;
  members: Member[];
  createdBy?: string;
  memberCount?: number;
  isPersonal?: boolean;
}
interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  onSubmit: (data: {
    groupId: string;
    amount: number;
    paidBy: string;
    payers?: { id: string; amount: number }[];
    participants: string[];
    note: string;
    place: string;
  }) => void;
  onAddMember?: (groupId: string, data: { name: string; isTemporary: boolean; deletionCondition: 'SETTLED' | 'TIME_LIMIT' }) => Promise<{ success: boolean; memberId?: string }>;
  initialGroupId?: string;
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const PERSONAL_CATEGORIES = [
  { id: 'food', label: 'Food', emoji: '🍕' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'rent', label: 'Rent', emoji: '🏠' },
  { id: 'bills', label: 'Bills', emoji: '💸' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'others', label: 'Others', emoji: '✨' },
];

const AddExpenseSheet = ({ open, onClose, groups, onSubmit, onAddMember, initialGroupId }: AddExpenseSheetProps) => {
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();
  const [step, setStep] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(initialGroupId || "");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [place, setPlace] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('others');
  const [payerMode, setPayerMode] = useState<'single' | 'multiple'>('single');
  const [multiPayers, setMultiPayers] = useState<{ id: string; amount: string }[]>([]);

  // Hooks
  const { isOnline, updatePendingCount } = useSync();
  const offline = !isOnline;
  const { fetchGroupDetail } = useFirebaseData();
  const { user } = useFirebaseAuth();

  // Temp member state
  const [showTempMemberInput, setShowTempMemberInput] = useState(false);
  const [tempMemberName, setTempMemberName] = useState("");
  const [tempMemberCondition, setTempMemberCondition] = useState<'SETTLED' | 'TIME_LIMIT'>('TIME_LIMIT');
  const [localTempMembers, setLocalTempMembers] = useState<Member[]>([]);
  const [fullGroupData, setFullGroupData] = useState<Group | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-select group if there's only one and it hasn't been set
  useEffect(() => {
    if (open && groups.length === 1 && !selectedGroup) {
      setSelectedGroup(groups[0].id);
      setStep(2);
    }
  }, [open, groups, selectedGroup]);

  // Handle auto-population for personal groups
  useEffect(() => {
    if (selectedGroup && user) {
      const groupData = groups.find(g => g.id === selectedGroup);
      if (groupData?.isPersonal) {
        setPaidBy(user.uid);
        setParticipants([user.uid]);
      }
    }
  }, [selectedGroup, user, groups]);

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      // Don't reset if it was already pre-selected or initialGroupId provided
      if (groups.length !== 1 && !initialGroupId) {
        setStep(1);
        setSelectedGroup("");
      } else {
        setSelectedGroup(initialGroupId || (groups.length === 1 ? groups[0].id : ""));
        setStep(2);
      }
      setAmount("");
      setPaidBy("");
      setParticipants([]);
      setNote("");
      setPlace("");
      setValidationErrors([]);
      setIsSubmitting(false);
      setSelectedCategory('others');
      setPayerMode('single');
      setMultiPayers([]);
    }
  }, [open, groups.length, initialGroupId]);

  // Get members from selected group
  const members = useMemo(() => {
    let allMembers: Member[] = [];
    if (fullGroupData && fullGroupData.id === selectedGroup) {
      allMembers = fullGroupData.members;
    } else {
      const group = groups.find((g) => g.id === selectedGroup);
      allMembers = group?.members || [];
    }

    // Merge local temp members if they are not already in the list
    const existingIds = new Set(allMembers.map(m => m.id));
    const newLocalMembers = localTempMembers.filter(m => !existingIds.has(m.id));
    allMembers = [...allMembers, ...newLocalMembers];

    // Allow pending manual members (invited via email) but EXCLUDE existing app users who haven't joined yet (type='invited')
    return allMembers.filter(m => (m as any).type !== 'invited');
  }, [groups, selectedGroup, fullGroupData, localTempMembers]);

  // Fetch full group details when a group is selected to ensure members are loaded
  useEffect(() => {
    if (selectedGroup && isOnline) {
      setIsLoadingMembers(true);
      fetchGroupDetail(selectedGroup)
        .then((data) => {
          if (data) {
            setFullGroupData(data);
          }
        })
        .finally(() => {
          setIsLoadingMembers(false);
        });
    }
  }, [selectedGroup, isOnline, fetchGroupDetail]);


  const handlePayerAmountChange = (memberId: string, value: string) => {
    setMultiPayers(prev => {
      const existing = prev.find(p => p.id === memberId);
      if (!existing && !value) return prev; // Don't add empty entries

      const newList = prev.filter(p => p.id !== memberId);
      if (value) {
        newList.push({ id: memberId, amount: value });
      }
      return newList;
    });
  };

  const totalPaidAmount = useMemo(() => {
    return multiPayers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [multiPayers]);

  const remainingToPay = useMemo(() => {
    const total = parseFloat(amount) || 0;
    return total - totalPaidAmount;
  }, [amount, totalPaidAmount]);

  // Handle expense submission
  const handleSubmit = async () => {
    const totalAmount = parseFloat(amount);

    let finalPayers: { id: string; amount: number }[] | undefined;
    let finalPaidBy = paidBy;

    if (payerMode === 'multiple') {
      if (Math.abs(remainingToPay) > 0.05) {
        toast.error(`Total paid (${formatAmount(totalPaidAmount)}) must match expense amount (${formatAmount(totalAmount)})`);
        return;
      }
      if (multiPayers.length === 0) {
        toast.error("Please add at least one payer");
        return;
      }
      finalPayers = multiPayers.map(p => ({ id: p.id, amount: parseFloat(p.amount) }));
      // Set primary payer (largest amount) for legacy support
      const primary = finalPayers.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
      finalPaidBy = primary.id;
    } else {
      // Single mode
      // finalPayers remains undefined (or we could set it for consistency, but backend handles it)
    }

    const totalAmount = parseFloat(amount);

    // Validate Multiple Payers
    if (payerMode === 'multiple') {
      if (Math.abs(remainingToPay) > 0.05) {
        toast.error(`Total paid (${formatAmount(totalPaidAmount)}) must match expense amount (${formatAmount(totalAmount)})`);
        return;
      }
      if (multiPayers.length === 0) {
        toast.error("Please add at least one payer");
        return;
      }
    }
    const invalidParticipants = participants.filter(p => !members.some(m => String(m.id) === String(p)));
    if (invalidParticipants.length > 0) {
      console.error("Invalid participants detected:", { invalidParticipants, availableMembers: members.map(m => m.id) });
      toast.error(t('common.error'));
      return;
    }

    setIsSubmitting(true);

    if (offline) {
      // Save for later sync
      const offlineExpense = {
        groupId: selectedGroup,
        groupName: selectedGroupData?.name || "Unknown Group",
        amount: parseFloat(amount),
        paidBy: finalPaidBy,
        payers: finalPayers,
        participants,
        note: selectedGroupData?.isPersonal
          ? `${PERSONAL_CATEGORIES.find(c => c.id === selectedCategory)?.emoji} ${PERSONAL_CATEGORIES.find(c => c.id === selectedCategory)?.label}${note ? ': ' + note : ''}`
          : note,
        place,
        timestamp: Date.now(),
        synced: false
      };

      try {
        await saveOfflineExpense(offlineExpense);
        updatePendingCount();
        toast.success(t('sheets.add_expense.offline_saved'), {
          description: t('sheets.add_expense.offline_sync_notice')
        });
        setIsSubmitting(false);
        onClose();
      } catch (error) {
        console.error("Failed to save offline expense:", error);
        toast.error(t('sheets.add_expense.offline_save_failed'));
        setIsSubmitting(false);
      }
    } else {
      // Online submission
      try {
        await onSubmit({
          groupId: selectedGroup,
          amount: parseFloat(amount),
          paidBy: finalPaidBy,
        payers: finalPayers,
          participants,
          note: selectedGroupData?.isPersonal
            ? `${PERSONAL_CATEGORIES.find(c => c.id === selectedCategory)?.emoji} ${PERSONAL_CATEGORIES.find(c => c.id === selectedCategory)?.label}${note ? ': ' + note : ''}`
            : note,
          place
        });
        setIsSubmitting(false);
        onClose();
      } catch (error) {
        console.error("Failed to submit expense:", error);
        toast.error(t('sheets.add_expense.submit_failed'));
        setIsSubmitting(false);
      }
    }
  };

  const toggleParticipant = (id: string) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    if (step === 1) return selectedGroup !== "";
    if (step === 2) {
      const amountValue = parseFloat(amount);
      return amountValue > 0 && !isNaN(amountValue);
    }
    if (step === 3) {
      if (payerMode === 'single') return paidBy !== "";
      // For multiple, check if amounts match
      const total = parseFloat(amount) || 0;
      const currentPaid = multiPayers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      return Math.abs(total - currentPaid) < 0.05 && multiPayers.length > 0;
    }
    if (step === 4) return participants.length > 0;
    return true;
  };

  const handleAddTempMember = async () => {
    if (!tempMemberName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (!selectedGroup) {
      toast.error("Please select a group first");
      return;
    }

    if (!onAddMember) return;

    // Show loading toast
    const loadingToast = toast.loading(`Adding ${tempMemberName.trim()}...`);

    try {
      const result = await onAddMember(selectedGroup, {
        name: tempMemberName.trim(),
        isTemporary: true,
        deletionCondition: tempMemberCondition
      });

      if (result.success && result.memberId) {
        // Optimistically add to local state so they appear immediately in the list
        const newMember: Member = {
          id: result.memberId,
          name: tempMemberName.trim(),
          isTemporary: true,
          deletionCondition: tempMemberCondition
        };
        setLocalTempMembers(prev => [...prev, newMember]);

        // Automatically add the new member to participants
        setParticipants(prev => [...prev, result.memberId!]);
        setTempMemberName("");
        setShowTempMemberInput(false);
        toast.dismiss(loadingToast);
        toast.success(`${tempMemberName.trim()} added and selected for split`);
      } else {
        toast.dismiss(loadingToast);
        toast.error(t('common.error'));
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(t('common.error'));
    }
  };

  const paidByName = members.find((m) => m.id === paidBy)?.name;
  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

  // Calculate split details for display
  const splitDetails = useMemo(() => {
    const totalAmount = parseFloat(amount) || 0;
    const count = participants.length || 1;
    const perPerson = count > 0 ? Math.round((totalAmount / count) * 100) / 100 : 0;

    // Logic: 
    // If I paid (paidBy === me), I receive (Total - MyShare)
    // If someone else paid, I owe MyShare

    // Ideally we'd use calculateExpenseSplit here, but for display simplicity:
    return {
      perPerson,
      toReceive: (totalAmount - perPerson), // Rough estimate for UI
      toGive: perPerson,
      othersCount: Math.max(0, count - 1)
    };
  }, [amount, participants]);

  return (
    <>
      <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 z-[100]">

          {/* Loading Overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 z-[150] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-black text-slate-900">{t('sheets.add_expense.processing')}</h3>
            </div>
          )}

          <SheetHeader className="flex-shrink-0 mb-6 pt-2">
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>

            {/* Offline Indicator */}
            {offline && (
              <div className="mx-auto mb-4 inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs font-bold text-orange-700">{t('sheets.add_expense.offline_indicator')}</span>
              </div>
            )}

            <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">
              {step === 1 && t('sheets.add_expense.step_select_group')}
              {step === 2 && t('sheets.add_expense.step_amount')}
              {step === 3 && t('sheets.add_expense.step_who_paid')}
              {step === 4 && t('sheets.add_expense.step_split')}
              {step === 5 && (selectedGroupData?.isPersonal ? t('sheets.add_expense.step_review') : t('sheets.add_expense.step_details'))}
            </SheetTitle>
            <SheetDescription className="text-center text-sm text-[#4a6850] font-bold">
              {t('sheets.add_expense.details_prompt')}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto pb-4">
            {/* Validation Errors - iPhone Style */}
            {validationErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200/50 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-black text-red-800">{t('sheets.add_expense.fix_errors')}</span>
                </div>
                <ul className="text-sm text-red-700 space-y-2">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="font-bold">• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step 1: Select Group - Compact Mobile Style */}
            {step === 1 && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-sm text-[#4a6850] mb-4 text-center font-bold">
                  {t('sheets.add_expense.group_prompt')}
                </p>
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                      selectedGroup === group.id
                        ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                        : "bg-white border-2 border-gray-200 hover:border-[#4a6850]/30 hover:bg-[#4a6850]/5"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 flex items-center justify-center text-xl shadow-sm flex-shrink-0">
                      {group.emoji}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <span className="font-black text-gray-900 tracking-tight block truncate">{group.name}</span>
                      {(group.memberCount || group.members.length) > 0 && (
                        <p className="text-xs text-[#4a6850] font-bold">
                          {t('sheets.add_expense.member_count', { count: group.memberCount || group.members.length })}
                        </p>
                      )}
                    </div>
                    {selectedGroup === group.id && (
                      <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center shadow-md flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-white font-bold" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Enter Amount - iPhone Style */}
            {step === 2 && (
              <div className="text-center py-12 animate-fade-in">
                {selectedGroupData && (
                  <div className="inline-flex items-center gap-3 bg-[#4a6850]/10 rounded-3xl px-5 py-3 mb-8 border border-[#4a6850]/20">
                    <span className="text-2xl">{selectedGroupData.emoji}</span>
                    <span className="text-sm font-black text-[#4a6850]">{selectedGroupData.name}</span>
                  </div>
                )}
                <label htmlFor="add-expense-amount" className="text-[#4a6850] text-sm font-bold mb-4 block cursor-pointer">{t('sheets.add_expense.amount_prompt')}</label>
                <div className="text-4xl font-black text-gray-900 mb-8 tracking-tighter tabular-nums">
                  {formatAmount(parseFloat(amount) || 0)}
                </div>
                <Input
                  id="add-expense-amount"
                  type="number"
                  placeholder={t('sheets.add_expense.amount_label')}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-center text-xl h-14 max-w-sm mx-auto rounded-3xl border-2 border-[#4a6850]/30 shadow-lg font-black text-gray-900 placeholder:text-[#4a6850] focus:border-[#4a6850] focus:ring-0 focus:shadow-xl"
                  autoFocus
                />
              </div>
            )}

            {/* Step 3: Who Paid - Compact Mobile Style */}
            {step === 3 && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 justify-center mb-4">
                  <p className="text-sm text-[#4a6850] font-bold text-center">{t('sheets.add_expense.who_paid_prompt')}</p>
                  <Tooltip
                    content={t('sheets.add_expense.who_paid_prompt')}
                    position="bottom"
                  />
                </div>

                {/* Mode Toggle */}
                <div className="bg-gray-100 p-1 rounded-xl flex mb-4">
                  <button
                    className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", payerMode === 'single' ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}
                    onClick={() => setPayerMode('single')}
                  >
                    Single Payer
                  </button>
                  <button
                    className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", payerMode === 'multiple' ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}
                    onClick={() => setPayerMode('multiple')}
                  >
                    Multiple Payers
                  </button>
                </div>

                {isLoadingMembers ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3 animate-fade-in">
                    <div className="w-8 h-8 border-4 border-[#4a6850]/20 border-t-[#4a6850] rounded-full animate-spin"></div>
                    <p className="text-sm text-[#4a6850]/70 font-bold">{t('common.loading')}</p>
                  </div>
                ) : (
                  <>
                    {/* SINGLE PAYER MODE */}
                    {payerMode === 'single' && members.filter(m => !m.isTemporary).map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setPaidBy(member.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                          paidBy === member.id
                            ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                            : "bg-white border-2 border-gray-200 hover:border-[#4a6850]/30 hover:bg-[#4a6850]/5"
                        )}
                      >
                        <Avatar name={member.name} size="sm" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 tracking-tight block truncate">{member.name}</span>
                            {(member.id === fullGroupData?.createdBy || (member as any).userId === fullGroupData?.createdBy) && (
                              <span className="px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-700 border border-yellow-200 text-[10px] font-black uppercase tracking-wider">{t('sheets.add_expense.owner')}</span>
                            )}
                          </div>
                        </div>
                        {paidBy === member.id && (
                          <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center shadow-md flex-shrink-0">
                            <Check className="w-3.5 h-3.5 text-white font-bold" />
                          </div>
                        )}
                      </button>
                    ))}

                    {/* MULTIPLE PAYER MODE */}
                    {payerMode === 'multiple' && (
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-2 flex justify-between items-center">
                           <span className="text-xs font-bold text-orange-800">Total to allocate:</span>
                           <span className="text-sm font-black text-orange-900">{formatAmount(parseFloat(amount) || 0)}</span>
                        </div>

                        {members.map((member) => {
                           const payerEntry = multiPayers.find(p => p.id === member.id);
                           const isPaying = !!payerEntry;

                           return (
                             <div key={member.id} className={cn(
                               "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all",
                               isPaying ? "border-[#4a6850] bg-[#4a6850]/5" : "border-gray-100 bg-white"
                             )}>
                                <Avatar name={member.name} size="sm" />
                                <div className="flex-1 min-w-0">
                                   <div className="font-bold text-sm text-gray-900 truncate">{member.name}</div>
                                </div>
                                <div className="relative w-28">
                                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{selectedGroupData?.currency || ''}</span>
                                   <Input
                                      type="number"
                                      placeholder="0"
                                      className={cn(
                                        "w-full h-10 pl-6 text-right font-bold rounded-xl border-gray-200 focus:border-[#4a6850]",
                                        isPaying ? "text-[#4a6850]" : "text-gray-400"
                                      )}
                                      value={payerEntry?.amount || ''}
                                      onChange={(e) => handlePayerAmountChange(member.id, e.target.value)}
                                   />
                                </div>
                             </div>
                           );
                        })}

                        {/* Remaining Indicator */}
                        <div className={cn(
                          "fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl border backdrop-blur-md transition-all z-50 flex items-center gap-2",
                          Math.abs(remainingToPay) < 0.05
                            ? "bg-emerald-500/90 border-emerald-400 text-white"
                            : "bg-gray-900/90 border-gray-700 text-white"
                        )}>
                           {Math.abs(remainingToPay) < 0.05 ? (
                             <>
                               <Check className="w-4 h-4 font-bold" />
                               <span className="font-black text-sm">Perfectly allocated!</span>
                             </>
                           ) : (
                             <>
                               <span className="text-xs font-bold opacity-80">{remainingToPay > 0 ? "Remaining:" : "Overpaid:"}</span>
                               <span className={cn("font-black text-lg tabular-nums", remainingToPay < 0 ? "text-red-300" : "text-white")}>
                                 {formatAmount(Math.abs(remainingToPay))}
                               </span>
                             </>
                           )}
                        </div>
                        {/* Spacer for fixed indicator */}
                        <div className="h-12"></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}


            {/* Step 4: Split Between - Compact Mobile Style */}
            {step === 4 && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 justify-center mb-4">
                  <p className="text-sm text-[#4a6850] font-bold text-center">
                    {t('sheets.add_expense.split_prompt')}
                  </p>
                  <Tooltip
                    content={t('sheets.add_expense.split_prompt')}
                    position="bottom"
                  />
                </div>
                {isLoadingMembers ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3 animate-fade-in">
                    <div className="w-8 h-8 border-4 border-[#4a6850]/20 border-t-[#4a6850] rounded-full animate-spin"></div>
                    <p className="text-sm text-[#4a6850]/70 font-bold">{t('common.loading')}</p>
                  </div>
                ) : (
                  <>
                    {members.map((member) => {
                      const isSelected = participants.includes(member.id);

                      return (
                        <button
                          key={member.id}
                          onClick={() => toggleParticipant(member.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                            isSelected
                              ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                              : "bg-white border-2 border-gray-200 hover:border-[#4a6850]/30 hover:bg-[#4a6850]/5"
                          )}
                        >
                          <Avatar name={member.name} size="sm" />
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-gray-900 tracking-tight block truncate">{member.name}</span>
                              {member.isTemporary && (
                                <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">{t('sheets.add_expense.temp')}</span>
                              )}
                              {(member.id === fullGroupData?.createdBy || (member as any).userId === fullGroupData?.createdBy) && (
                                <span className="px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-700 border border-yellow-200 text-[10px] font-black uppercase tracking-wider">{t('sheets.add_expense.owner')}</span>
                              )}
                              {member.isPending && !member.isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider">{t('sheets.add_expense.invited')}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {member.balance !== undefined && member.balance !== null && (
                                <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100">
                                  {formatAmount(member.balance)}
                                </span>
                              )}
                            {(member as any).walletBalance !== undefined && (member as any).walletBalance !== null && (
                              <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg border border-blue-100 flex items-center gap-1">
                                <Wallet className="w-3 h-3" /> {formatAmount((member as any).walletBalance)}
                              </span>
                            )}
                              {member.isTemporary && (
                                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-orange-600">
                                  {member.deletionCondition === 'TIME_LIMIT' ? <Clock className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                                  <span>{t('sheets.add_expense.temp')} • {member.deletionCondition === 'TIME_LIMIT' ? t('sheets.add_expense.seven_days') : t('sheets.add_expense.until_settled')}</span>
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <div className="text-xs text-[#4a6850] font-bold">
                                {t('sheets.add_expense.share_label', { amount: formatAmount(splitDetails.perPerson) })}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center shadow-md flex-shrink-0">
                              <Check className="w-3.5 h-3.5 text-white font-bold" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Add Temp Member Button */}
                <button
                  onClick={() => setShowTempMemberInput(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-[#4a6850]/30 text-[#4a6850] font-bold hover:bg-[#4a6850]/5 transition-all mt-3"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="text-sm">{t('sheets.add_expense.add_temp_member_btn')}</span>
                </button>

                {/* Split Summary - Compact - Only show when 2+ participants */}
                {participants.length > 1 && paidBy && (
                  <div className="bg-gradient-to-r from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl p-4 mt-4 border border-[#4a6850]/20 shadow-md">
                    <div className="text-xs text-[#4a6850] mb-2 font-black uppercase tracking-wide">{t('sheets.add_expense.split_summary')}</div>
                    <div className="text-lg font-black text-gray-900 tracking-tight">
                      {formatAmount(splitDetails.perPerson)} {t('sheets.add_expense.per_person')}
                    </div>
                    {splitDetails.toReceive > 0 && (
                      <div className="text-[#4a6850] font-black mt-2 text-sm">
                        {t('sheets.add_expense.you_will_receive', { amount: formatAmount(splitDetails.toReceive), count: splitDetails.othersCount, people: splitDetails.othersCount === 1 ? t('sheets.add_expense.person') : t('sheets.add_expense.people') })}
                      </div>
                    )}
                    {splitDetails.toGive > 0 && (
                      <div className="text-red-600 font-black mt-2 text-sm">
                        {t('sheets.add_expense.you_owe', { amount: formatAmount(splitDetails.toGive), name: paidByName })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Add Details - iPhone Style */}
            {step === 5 && (
              <div className="space-y-6 animate-fade-in">
                {/* Category Selection for Personal/Self tracking */}
                {selectedGroupData?.isPersonal && (
                  <div>
                    <label className="text-sm font-black text-[#4a6850] mb-4 block uppercase tracking-wide">
                      {t('sheets.add_expense.select_category')}
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {PERSONAL_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2",
                            selectedCategory === cat.id
                              ? "bg-[#4a6850]/10 border-[#4a6850] scale-105 shadow-md"
                              : "bg-white border-gray-100 hover:border-[#4a6850]/30"
                          )}
                        >
                          <span className="text-2xl">{cat.emoji}</span>
                          <span className="text-[10px] font-black uppercase text-[#4a6850]">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="add-expense-note" className="text-sm font-black text-[#4a6850] mb-3 block uppercase tracking-wide">
                    {selectedGroupData?.isPersonal ? t('sheets.add_expense.add_note') : t('sheets.add_expense.optional_note')}
                  </label>
                  <Input
                    id="add-expense-note"
                    placeholder={selectedGroupData?.isPersonal ? t('sheets.add_expense.note_placeholder') : t('sheets.add_expense.optional_note_placeholder')}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850] focus:border-[#4a6850] focus:shadow-xl"
                    maxLength={100}
                  />
                  <div className="flex justify-end mt-1 px-4">
                    <span className={cn("text-[10px] font-bold transition-colors", note.length >= 100 ? "text-red-500" : "text-gray-400")}>
                      {note.length}/100
                    </span>
                  </div>
                </div>

                {!selectedGroupData?.isPersonal && (
                  <div>
                    <label htmlFor="add-expense-place" className="text-sm font-black text-[#4a6850] mb-3 block uppercase tracking-wide">
                      {t('sheets.add_expense.where')}
                    </label>
                    <Input
                      id="add-expense-place"
                      placeholder={t('sheets.add_expense.where_placeholder')}
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      className="h-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850] focus:border-[#4a6850] focus:shadow-xl"
                      maxLength={100}
                    />
                    <div className="flex justify-end mt-1 px-4">
                      <span className={cn("text-[10px] font-bold transition-colors", place.length >= 100 ? "text-red-500" : "text-gray-400")}>
                        {place.length}/100
                      </span>
                    </div>
                  </div>
                )}

                {/* Final Summary - iPhone Style */}
                <div className="bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl p-6 mt-8 shadow-[0_25px_70px_rgba(74,104,80,0.3)] text-white">
                  <div className="text-sm text-white/90 mb-3 font-black uppercase tracking-wide">
                    {selectedGroupData?.isPersonal ? t('sheets.add_expense.personal_expense') : t('sheets.add_expense.final_summary')}
                  </div>
                  <div className="font-black text-2xl tracking-tight mb-2">{formatAmount(parseFloat(amount) || 0)}</div>

                  {selectedGroupData?.isPersonal ? (
                    <div className="flex items-center gap-2 text-sm text-white/90 font-bold">
                      <span>{t('sheets.add_expense.category')}</span>
                      <span className="bg-white/20 px-2 py-1 rounded-lg">
                        {PERSONAL_CATEGORIES.find(c => c.id === selectedCategory)?.emoji} {PERSONAL_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-white/90 font-bold">
                        {t('sheets.add_expense.paid_by_label')} {paidByName} • {t('sheets.add_expense.participants_label')} {participants.length}
                      </div>
                      <div className="text-sm text-white/90 font-bold">
                        {formatAmount(splitDetails.perPerson)} {t('sheets.add_expense.per_person')}
                      </div>
                      {splitDetails.toReceive > 0 && (
                        <div className="text-emerald-200 font-black mt-3 text-lg">
                          You will receive {formatAmount(splitDetails.toReceive)}
                        </div>
                      )}
                      {splitDetails.toGive > 0 && (
                        <div className="text-orange-200 font-black mt-3 text-lg">
                          You owe {formatAmount(splitDetails.toGive)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 pt-6 border-t border-[#4a6850]/10 bg-white">
            <div className="flex gap-4">
              {step > 1 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (step === 5 && selectedGroupData?.isPersonal) {
                      setStep(2);
                    } else {
                      setStep((s) => s - 1);
                    }
                  }}
                  className="flex-1 h-14 rounded-3xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black border-0 shadow-lg hover:shadow-xl transition-all"
                >
                  {t('common.back')}
                </Button>
              )}
              {step < 5 ? (
                <Button
                  onClick={() => {
                    if (step === 2 && selectedGroupData?.isPersonal) {
                      setStep(5);
                    } else {
                      setStep((s) => s + 1);
                    }
                  }}
                  disabled={!canProceed()}
                  className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.continue')} <ChevronRight className="w-5 h-5 ml-2 font-bold" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all"
                >
                  {t('sheets.add_expense.submit_btn')}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Temp Member Dialog */}
      <Dialog open={showTempMemberInput} onOpenChange={setShowTempMemberInput}>
        <DialogContent className="rounded-3xl p-6 bg-white border border-[#4a6850]/20 shadow-[0_25px_70px_rgba(74,104,80,0.2)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 tracking-tight">{t('sheets.add_expense.dialog_title')}</DialogTitle>
            <DialogDescription className="text-sm text-[#4a6850] font-bold">
              {t('sheets.add_expense.dialog_desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="tempName" className="text-sm font-black text-[#4a6850] uppercase tracking-wide">Name</Label>
              <Input
                id="tempName"
                placeholder="e.g. John Doe (Friend)"
                value={tempMemberName}
                onChange={(e) => setTempMemberName(e.target.value)}
                className="h-12 rounded-2xl border-[#4a6850]/30 font-bold text-gray-900 placeholder:text-[#4a6850] focus:border-[#4a6850] focus:ring-[#4a6850]/20"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-black text-[#4a6850] uppercase tracking-wide">{t('sheets.add_expense.auto_delete')}</Label>
              <RadioGroup
                value={tempMemberCondition}
                onValueChange={(v) => setTempMemberCondition(v as any)}
                className="grid gap-3"
              >
                <div className={cn(
                  "flex items-start space-x-3 border-2 rounded-2xl p-4 cursor-pointer transition-all",
                  tempMemberCondition === 'TIME_LIMIT'
                    ? "border-[#4a6850] bg-[#4a6850]/5"
                    : "border-gray-200 hover:border-[#4a6850]/30 hover:bg-[#4a6850]/5"
                )}>
                  <RadioGroupItem value="TIME_LIMIT" id="time" className="mt-0.5 border-[#4a6850] text-[#4a6850]" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="time" className="font-black text-gray-900 flex items-center gap-2 cursor-pointer">
                      <Clock className="w-4 h-4 text-orange-500" />
                      {t('sheets.add_expense.after_1_week')}
                    </Label>
                    <span className="text-xs text-[#4a6850]/70 font-bold leading-normal">
                      {t('sheets.add_expense.after_1_week_desc')}
                    </span>
                  </div>
                </div>

                <div className={cn(
                  "flex items-start space-x-3 border-2 rounded-2xl p-4 cursor-pointer transition-all",
                  tempMemberCondition === 'SETTLED'
                    ? "border-[#4a6850] bg-[#4a6850]/5"
                    : "border-gray-200 hover:border-[#4a6850]/30 hover:bg-[#4a6850]/5"
                )}>
                  <RadioGroupItem value="SETTLED" id="settled" className="mt-0.5 border-[#4a6850] text-[#4a6850]" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="settled" className="font-black text-gray-900 flex items-center gap-2 cursor-pointer">
                      <Ban className="w-4 h-4 text-[#4a6850]" />
                      {t('sheets.add_expense.when_settled')}
                    </Label>
                    <span className="text-xs text-[#4a6850]/70 font-bold leading-normal">
                      {t('sheets.add_expense.when_settled_desc')}
                    </span>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTempMemberInput(false)}
              className="flex-1 h-12 rounded-2xl border-[#4a6850]/30 text-[#4a6850] font-black hover:bg-[#4a6850]/10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddTempMember}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4336] text-white font-black shadow-lg"
            >
              {t('sheets.add_expense.add_temp_member_btn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddExpenseSheet;
