import { useState, useMemo, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  Banknote,
  Smartphone,
  ChevronRight,
  Info,
  CreditCard,
  Wallet,
} from "lucide-react";
import Avatar from "./Avatar";
import Tooltip from "./Tooltip";
import { cn } from "@/lib/utils";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";

interface Member {
  id: string;
  name: string;
  paymentDetails?: {
    jazzCash?: string;
    easypaisa?: string;
    bankName?: string;
    accountNumber?: string;
    raastId?: string;
  };
  phone?: string;
  isTemporary?: boolean;
  isCurrentUser?: boolean;
  isPending?: boolean;
  userId?: string;
}

interface Group {
  id: string;
  name: string;
  emoji: string;
  members: Member[];
  createdBy?: string;
  memberCount?: number;
}

interface RecordPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  onSubmit: (data: {
    groupId: string;
    fromMember: string;
    amount: number;
    method: "cash" | "online";
    note: string;
  }) => Promise<void>;
}

const RecordPaymentSheet = ({
  open,
  onClose,
  groups,
  onSubmit,
}: RecordPaymentSheetProps) => {
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();
  const { getSettlements } = useFirebaseAuth();
  const { fetchGroupDetail } = useFirebaseData();
  const [step, setStep] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [fromMember, setFromMember] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "online">("cash");
  const [note, setNote] = useState("");
  const [fullGroupData, setFullGroupData] = useState<Group | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get members from selected group (exclude "You") and sort by those who owe money
  const otherMembers = useMemo(() => {
    let allMembers: Member[] = [];
    if (fullGroupData && fullGroupData.id === selectedGroup) {
      allMembers = fullGroupData.members;
    } else {
      const group = groups.find((g) => g.id === selectedGroup);
      allMembers = group?.members || [];
    }

    if (allMembers.length === 0) return [];

    // Filter out "You" and "Invited" user-types (who haven't joined yet)
    const filteredMembers = allMembers.filter(
      (m) => !m.isCurrentUser && (m as any).type !== "invited",
    );

    // Sort by amount they owe (toReceive) descending
    const groupSettlements = getSettlements(selectedGroup);
    return [...filteredMembers].sort((a, b) => {
      const oweA = groupSettlements[a.id]?.toReceive || 0;
      const oweB = groupSettlements[b.id]?.toReceive || 0;
      return oweB - oweA;
    });
  }, [groups, selectedGroup, getSettlements, fullGroupData]);

  // Get settlement data for selected group
  const settlements = selectedGroup ? getSettlements(selectedGroup) : {};

  // Get selected member's details including settlement info
  const selectedMemberData = useMemo(() => {
    if (!fromMember || !selectedGroup) return null;

    const member = otherMembers.find((m) => m.id === fromMember);
    if (!member) return null;

    const settlement = settlements[fromMember] || { toReceive: 0, toPay: 0 };
    const group = groups.find((g) => g.id === selectedGroup);
    const fullMember = group?.members.find((m) => m.id === fromMember);

    return {
      ...member,
      settlement,
      paymentDetails: fullMember?.paymentDetails,
      phone: fullMember?.phone,
    };
  }, [fromMember, selectedGroup, otherMembers, settlements, groups]);

  // Auto-select group if only one exists
  // ... existing state ...

  // Fetch full group details when a group is selected to ensure members are loaded
  useEffect(() => {
    const loadGroupDetails = async () => {
      if (selectedGroup && open) {
        setIsLoadingMembers(true);
        try {
          const result = await fetchGroupDetail(selectedGroup);
          if (result && result.id === selectedGroup) {
            setFullGroupData(result as any);
          }
        } catch (error) {
          console.error("Failed to fetch group details:", error);
        } finally {
          setIsLoadingMembers(false);
        }
      }
    };

    loadGroupDetails();
  }, [selectedGroup, open, fetchGroupDetail]);

  // Auto-select group if only one exists (only on initial open)
  useEffect(() => {
    if (open && groups.length === 1 && step === 1 && !selectedGroup) {
      setSelectedGroup(groups[0].id);
      setStep(2);
    }
  }, [open, groups, step, selectedGroup]);

  const handleClose = () => {
    setStep(groups.length === 1 ? 2 : 1);
    setSelectedGroup(groups.length === 1 ? groups[0]?.id || "" : "");
    setFromMember("");
    setAmount("");
    setMethod("cash");
    setNote("");
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    // Final validation before submission
    const amountValue = parseFloat(amount);

    if (!selectedGroup) {
      console.error("No group selected");
      return;
    }

    if (!fromMember) {
      console.error("No payer selected");
      return;
    }

    const settlement = settlements[fromMember] || { toReceive: 0, toPay: 0 };
    if (settlement.toReceive <= 0) {
      toast.error(
        t("sheets.record_payment.not_owe_error", { name: selectedMemberName }),
      );
      return;
    }

    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error(t("sheets.record_payment.enter_valid_amount"));
      return;
    }

    if (amountValue > settlement.toReceive) {
      toast.error(
        t("sheets.record_payment.amount_exceeds", {
          name: selectedMemberName,
          amount: formatAmount(settlement.toReceive),
        }),
      );
      return;
    }

    // Check if fromMember exists in otherMembers
    const memberExists = otherMembers.some((m) => m.id === fromMember);
    if (!memberExists) {
      console.error("Invalid member ID");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        groupId: selectedGroup,
        fromMember,
        amount: amountValue,
        method,
        note: note.trim(),
      });
      handleClose();
    } catch (error) {
      console.error("Record payment error:", error);
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return selectedGroup !== "";
    if (step === 2) {
      if (!fromMember) return false;
      // Member must owe money to proceed to Step 3
      const settlement = settlements[fromMember] || { toReceive: 0, toPay: 0 };
      return settlement.toReceive > 0;
    }
    if (step === 3) {
      const amountValue = parseFloat(amount);
      const settlement = settlements[fromMember] || { toReceive: 0, toPay: 0 };
      return (
        amountValue > 0 &&
        !isNaN(amountValue) &&
        amountValue <= settlement.toReceive
      );
    }
    return true;
  };

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);
  const selectedMemberName = otherMembers.find(
    (m) => m.id === fromMember,
  )?.name;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 shadow-[0_-20px_60px_rgba(74,104,80,0.1)] z-[100]"
      >
        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 z-[150] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
            <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-black text-slate-900">
              {t("sheets.add_expense.processing")}
            </h3>
          </div>
        )}

        <SheetHeader className="flex-shrink-0 mb-6 pt-2">
          {/* Handle Bar */}
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>

          <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">
            {step === 1 && t("sheets.record_payment.step_select_group")}
            {step === 2 && t("sheets.record_payment.step_who_paid_you")}
            {step === 3 && t("sheets.record_payment.step_payment_details")}
          </SheetTitle>
          <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
            {t("sheets.record_payment.subtitle")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Step 1: Select Group - Compact Mobile Style */}
          {step === 1 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-[#4a6850]/80 mb-4 text-center font-bold">
                {t("sheets.record_payment.group_prompt")}
              </p>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                    selectedGroup === group.id
                      ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                      : "bg-white border-2 border-gray-200 hover:border-[#4a6850]/30 hover:bg-[#4a6850]/5",
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 flex items-center justify-center text-xl shadow-sm flex-shrink-0">
                    {group.emoji}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <span className="font-black text-gray-900 tracking-tight block truncate">
                      {group.name}
                    </span>
                    {(group.memberCount || group.members.length) > 0 && (
                      <p className="text-xs text-[#4a6850]/80 font-bold">
                        {t("sheets.add_expense.member_count", {
                          count: group.memberCount || group.members.length,
                        })}
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

          {/* Step 2: Who paid you - Compact Mobile Style */}
          {step === 2 && (
            <div className="animate-fade-in">
              {selectedGroupData && (
                <div className="flex items-center justify-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-[#4a6850]/10 rounded-2xl px-4 py-2 border border-[#4a6850]/20">
                    <span className="text-xl">{selectedGroupData.emoji}</span>
                    <span className="text-sm font-black text-[#4a6850]">
                      {selectedGroupData.name}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-sm text-[#4a6850]/80 mb-4 text-center font-bold">
                {t("sheets.record_payment.who_sent_prompt")}
              </p>
              <div className="space-y-3">
                {isLoadingMembers ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in">
                    <div className="w-12 h-12 border-4 border-[#4a6850]/20 border-t-[#4a6850] rounded-full animate-spin"></div>
                    <p className="text-sm text-[#4a6850]/70 font-black">
                      {t("sheets.record_payment.finding_members")}
                    </p>
                  </div>
                ) : otherMembers.length === 0 ? (
                  <div className="text-center py-12 px-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 font-bold">
                      {t("sheets.record_payment.no_members_found")}
                    </p>
                  </div>
                ) : (
                  otherMembers.map((member) => {
                    const settlement = settlements[member.id] || {
                      toReceive: 0,
                      toPay: 0,
                    };
                    const owesYou = settlement.toReceive > 0;
                    const youOwe = settlement.toPay > 0;
                    const isSettled =
                      settlement.toReceive === 0 && settlement.toPay === 0;

                    return (
                      <button
                        key={member.id}
                        onClick={() => setFromMember(member.id)}
                        disabled={!owesYou}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                          fromMember === member.id
                            ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                            : "bg-white border-2 border-gray-200 hover:border-[#4a6850]/30 hover:bg-[#4a6850]/5",
                          !owesYou &&
                            "opacity-50 grayscale cursor-not-allowed border-dashed bg-gray-50",
                        )}
                      >
                        <Avatar name={member.name} size="sm" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-black text-gray-900 tracking-tight truncate">
                              {member.name}
                            </div>
                            {(member.id === selectedGroupData?.createdBy ||
                              (member as any).userId ===
                                selectedGroupData?.createdBy) && (
                              <span className="px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-700 border border-yellow-200 text-[10px] font-black uppercase tracking-wider">
                                {t("sheets.add_expense.owner")}
                              </span>
                            )}
                            {(member as any).isPending && (
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider">
                                {t("sheets.add_expense.invited")}
                              </span>
                            )}
                            {member.isTemporary && (
                              <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">
                                {t("sheets.add_expense.temp")}
                              </span>
                            )}
                            {!owesYou && (
                              <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-wider">
                                {t("common.no_debt")}
                              </span>
                            )}
                          </div>
                          {(member as any).walletBalance !== undefined &&
                            (member as any).walletBalance !== null && (
                              <div className="flex items-center gap-1 text-[11px] font-black text-blue-600 bg-blue-50 w-fit px-1.5 py-0.5 rounded-lg border border-blue-100 mt-1">
                                <Wallet className="w-3 h-3" />
                                <span>
                                  {formatAmount((member as any).walletBalance)}
                                </span>
                              </div>
                            )}
                          <div className="text-xs font-bold truncate">
                            {isSettled ? (
                              <span className="text-emerald-600 font-black">
                                ✅ {t("common.all_settled")}
                              </span>
                            ) : owesYou ? (
                              <span className="text-[#4a6850] font-black">
                                {t("sheets.record_payment.owe_amount", {
                                  amount: formatAmount(settlement.toReceive),
                                })}
                              </span>
                            ) : youOwe ? (
                              <span className="text-red-500 font-black">
                                {t("common.you_owe_simple", {
                                  amount: formatAmount(settlement.toPay),
                                })}
                              </span>
                            ) : (
                              <span className="text-gray-500">
                                {t("common.no_pending")}
                              </span>
                            )}
                          </div>
                        </div>
                        {fromMember === member.id && (
                          <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center shadow-md flex-shrink-0">
                            <Check className="w-3.5 h-3.5 text-white font-bold" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Step 3: Amount and details - Compact Mobile Style */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              {/* Member Details Card - Compact */}
              {selectedMemberData && (
                <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl p-4 border border-[#4a6850]/20 shadow-md">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={selectedMemberData.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-gray-900 text-base tracking-tight truncate">
                          {selectedMemberData.name}
                        </h3>
                        {(selectedMemberData.id ===
                          selectedGroupData?.createdBy ||
                          (selectedMemberData as any).userId ===
                            selectedGroupData?.createdBy) && (
                          <span className="px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-700 border border-yellow-200 text-[10px] font-black uppercase tracking-wider">
                            {t("sheets.add_expense.owner")}
                          </span>
                        )}
                        {(selectedMemberData as any).isPending && (
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider">
                            {t("sheets.add_expense.invited")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold truncate">
                        {selectedMemberData.settlement.toReceive > 0 ? (
                          <span className="text-[#4a6850]">
                            💰{" "}
                            {t("sheets.record_payment.owe_amount", {
                              amount: formatAmount(
                                selectedMemberData.settlement.toReceive,
                              ),
                            })}
                          </span>
                        ) : selectedMemberData.settlement.toPay > 0 ? (
                          <span className="text-red-500">
                            💸{" "}
                            {t("common.you_owe_simple", {
                              amount: formatAmount(
                                selectedMemberData.settlement.toPay,
                              ),
                            })}
                          </span>
                        ) : (
                          <span className="text-[#4a6850]">
                            ✅ {t("common.all_settled")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Details - Compact */}
                  {selectedMemberData.paymentDetails &&
                    Object.keys(selectedMemberData.paymentDetails).length >
                      0 && (
                      <div className="mt-3 pt-3 border-t border-[#4a6850]/20">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="w-4 h-4 text-[#4a6850]" />
                          <span className="text-xs font-black text-[#4a6850] uppercase tracking-wide">
                            {t("common.payment_info")}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {selectedMemberData.paymentDetails.jazzCash && (
                            <div className="bg-white rounded-xl p-2 border border-[#4a6850]/10">
                              <span className="text-[#4a6850]/70 font-bold block">
                                {t("common.jazzcash")}
                              </span>
                              <div className="font-black text-gray-900 font-mono text-xs truncate">
                                {selectedMemberData.paymentDetails.jazzCash}
                              </div>
                            </div>
                          )}
                          {selectedMemberData.paymentDetails.easypaisa && (
                            <div className="bg-white rounded-xl p-2 border border-[#4a6850]/10">
                              <span className="text-[#4a6850]/70 font-bold block">
                                {t("common.easypaisa")}
                              </span>
                              <div className="font-black text-gray-900 font-mono text-xs truncate">
                                {selectedMemberData.paymentDetails.easypaisa}
                              </div>
                            </div>
                          )}
                          {selectedMemberData.paymentDetails.bankName && (
                            <div className="bg-white rounded-xl p-2 border border-[#4a6850]/10">
                              <span className="text-[#4a6850]/70 font-bold block">
                                {t("common.bank")}
                              </span>
                              <div className="font-black text-gray-900 font-mono text-xs truncate">
                                {selectedMemberData.paymentDetails.bankName}
                              </div>
                            </div>
                          )}
                          {selectedMemberData.paymentDetails.accountNumber && (
                            <div className="bg-white rounded-xl p-2 border border-[#4a6850]/10">
                              <span className="text-[#4a6850]/70 font-bold block">
                                {t("common.account")}
                              </span>
                              <div className="font-black text-gray-900 font-mono text-xs truncate">
                                {
                                  selectedMemberData.paymentDetails
                                    .accountNumber
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Quick Amount Suggestion - Compact */}
                  {selectedMemberData.settlement.toReceive > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#4a6850]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-[#4a6850]" />
                        <span className="text-xs font-black text-[#4a6850] uppercase tracking-wide">
                          {t("common.quick_fill")}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setAmount(
                            selectedMemberData.settlement.toReceive.toString(),
                          )
                        }
                        className="w-full bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white px-4 py-2 rounded-xl transition-all font-black shadow-md hover:shadow-lg text-sm"
                      >
                        {t("common.full_amount")}:{" "}
                        {formatAmount(selectedMemberData.settlement.toReceive)}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Amount - Compact */}
              <div>
                <label
                  htmlFor="record-payment-amount"
                  className="text-xs font-black text-[#4a6850]/80 mb-2 block uppercase tracking-wide"
                >
                  {t("sheets.record_payment.amount_label")}
                </label>
                <div className="text-center mb-4">
                  <div className="text-4xl font-black text-gray-900 mb-4 tracking-tighter tabular-nums">
                    {formatAmount(parseFloat(amount) || 0)}
                  </div>
                  <Input
                    id="record-payment-amount"
                    type="number"
                    placeholder={t("sheets.record_payment.amount_label")}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-center text-xl h-14 max-w-sm mx-auto rounded-3xl border-2 border-[#4a6850]/30 shadow-lg font-black text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:ring-0 focus:shadow-xl"
                    autoFocus
                  />
                </div>
              </div>

              {/* Payment Method - Compact */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs font-black text-[#4a6850]/80 uppercase tracking-wide">
                    {t("sheets.record_payment.method_label")}
                  </label>
                  <Tooltip
                    content={t("sheets.record_payment.method_label")}
                    position="top"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    aria-pressed={method === "cash"}
                    onClick={() => setMethod("cash")}
                    className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                      method === "cash"
                        ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                        : "bg-white border border-[#4a6850]/10 hover:bg-[#4a6850]/5",
                    )}
                  >
                    <Banknote
                      className={cn(
                        "w-5 h-5 font-bold",
                        method === "cash" ? "text-[#4a6850]" : "text-gray-500",
                      )}
                    />
                    <span
                      className={cn(
                        "font-black tracking-tight text-sm",
                        method === "cash" ? "text-[#4a6850]" : "text-gray-900",
                      )}
                    >
                      {t("common.cash")}
                    </span>
                  </button>

                  <button
                    aria-pressed={method === "online"}
                    onClick={() => setMethod("online")}
                    className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                      method === "online"
                        ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                        : "bg-white border border-[#4a6850]/10 hover:bg-[#4a6850]/5",
                    )}
                  >
                    <Smartphone
                      className={cn(
                        "w-5 h-5 font-bold",
                        method === "online"
                          ? "text-[#4a6850]"
                          : "text-gray-500",
                      )}
                    />
                    <span
                      className={cn(
                        "font-black tracking-tight text-sm",
                        method === "online"
                          ? "text-[#4a6850]"
                          : "text-gray-900",
                      )}
                    >
                      {t("common.online")}
                    </span>
                  </button>
                </div>
              </div>

              {/* Note - Compact */}
              <div>
                <label
                  htmlFor="record-payment-note"
                  className="text-xs font-black text-[#4a6850]/80 mb-2 block uppercase tracking-wide"
                >
                  {t("sheets.record_payment.note_label")}
                </label>
                <Input
                  id="record-payment-note"
                  placeholder={t("sheets.record_payment.note_label")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl"
                  maxLength={100}
                />
              </div>

              {/* Summary - Compact */}
              {parseFloat(amount) > 0 && (
                <div className="bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-2xl p-4 shadow-lg text-white animate-fade-in">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedMemberName || ""} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-lg tracking-tight text-white truncate">
                        +{formatAmount(parseFloat(amount) || 0)}
                      </div>
                      <div className="text-xs text-white/90 font-bold truncate">
                        {t("sheets.record_payment.received_from", {
                          name: selectedMemberName,
                        })}{" "}
                        •{" "}
                        {method === "cash"
                          ? t("sheets.record_payment.method_cash")
                          : t("sheets.record_payment.method_online")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-6 border-t border-[#4a6850]/10 bg-white">
          <div className="flex gap-4">
            {step > 1 && (
              <Button
                variant="secondary"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 h-14 rounded-3xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black border-0 shadow-lg hover:shadow-xl transition-all"
              >
                {t("common.back")}
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
              >
                {t("common.continue")}{" "}
                <ChevronRight className="w-5 h-5 ml-2 font-bold" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed()}
                className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
              >
                {t("sheets.record_payment.submit_btn")}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RecordPaymentSheet;
