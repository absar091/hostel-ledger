import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowDownLeft, Users, Phone, CreditCard, Bell, Loader2 } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import AppContainer from "@/components/AppContainer";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import Avatar from "@/components/Avatar";
import { useTranslation } from "react-i18next";
import MobileHeader from "@/components/MobileHeader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { callSecureApi } from "@/lib/api";
import { toast } from "sonner";

interface PersonToReceiveFrom {
  id: string;
  name: string;
  amount: number;
  groupId: string;
  groupName: string;
  phone?: string;
  paymentDetails?: {
    jazzCash?: string;
    easypaisa?: string;
    bankName?: string;
    accountNumber?: string;
    raastId?: string;
  };
  isTemporary?: boolean;
}

const ToReceive = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { groups, fetchGroupDetail } = useFirebaseData();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const [showPageGuide, setShowPageGuide] = useState(false);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  useEffect(() => {
    if (shouldShowPageGuide('to-receive')) {
      setShowPageGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleClosePageGuide = () => {
    setShowPageGuide(false);
    markPageGuideShown('to-receive');
  };

  // Calculate people who owe money to the current user
  const peopleWhoOweMe = useMemo(() => {
    if (!user || !user.settlements) return [];

    const people: PersonToReceiveFrom[] = [];

    // Iterate over settlements in the user profile (already group-aware)
    Object.entries(user.settlements).forEach(([groupId, groupSettlements]) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      Object.entries(groupSettlements).forEach(([memberId, settlements]) => {
        if (settlements.toReceive > 0) {
          // Find member name in the group's members list (if loaded)
          const member = group.members.find(m => m.id === memberId);

          people.push({
            id: memberId,
            name: member?.name || t('common.member_fallback', { username: memberId.substring(0, 5) }),
            amount: settlements.toReceive,
            groupId: groupId,
            groupName: group.name,
            phone: member?.phone,
            paymentDetails: member?.paymentDetails,
            isTemporary: member?.isTemporary,
          });
        }
      });
    });

    // Sort by amount (highest first)
    return people.sort((a, b) => b.amount - a.amount);
  }, [groups, user, t]);

  // Fetch group details if member names are missing
  useEffect(() => {
    peopleWhoOweMe.forEach(person => {
      // If the group members array is empty, which indicates lazy loading state
      // OR if this specific person is not found in the group members list
      const group = groups.find(g => g.id === person.groupId);
      const memberFound = group?.members?.some(m => m.id === person.id);

      if (group && (!group.members || group.members.length === 0 || !memberFound)) {
        fetchGroupDetail(person.groupId);
      }
    });
  }, [peopleWhoOweMe, groups, fetchGroupDetail]);

  const totalToReceive = peopleWhoOweMe.reduce((sum, person) => sum + person.amount, 0);

  const handlePersonClick = (person: PersonToReceiveFrom) => {
    // Navigate to group detail page
    navigate(`/group/${person.groupId}`);
  };

  const handleRemindClick = async (e: React.MouseEvent, person: PersonToReceiveFrom) => {
    e.stopPropagation();
    if (remindingId) return;

    const uniqueId = `${person.id}-${person.groupId}`;
    setRemindingId(uniqueId);
    
    try {
      const result = await callSecureApi('/api/reminders/send', {
        groupId: person.groupId,
        debtorId: person.id,
        creditorId: user?.uid,
        amount: person.amount
      });

      if (result.success) {
        toast.success("Reminder sent successfully", {
          description: `A notification has been sent to ${person.name}.`
        });
      } else {
        toast.error(result.error || "Failed to send reminder");
      }
    } catch (err: any) {
      console.error("Reminder error:", err);
      toast.error(err.message || "Network error sending reminder");
    } finally {
      setRemindingId(null);
    }
  };

  const formatPaymentDetails = (paymentDetails?: PersonToReceiveFrom['paymentDetails']) => {
    if (!paymentDetails) return null;

    const details = [];
    if (paymentDetails.jazzCash) details.push(`${t('common.jazzcash')}: ${paymentDetails.jazzCash}`);
    if (paymentDetails.easypaisa) details.push(`${t('common.easypaisa')}: ${paymentDetails.easypaisa}`);
    if (paymentDetails.bankName && paymentDetails.accountNumber) {
      details.push(`${paymentDetails.bankName}: ${paymentDetails.accountNumber}`);
    }
    if (paymentDetails.raastId) details.push(`${t('common.raast_id')}: ${paymentDetails.raastId}`);

    return details.length > 0 ? details.join(" • ") : null;
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar />

      <AppContainer className="bg-white pb-8">
        {/* Desktop Header */}
        <DesktopHeader />
        <MobileHeader title={t('to_receive.title')} showBackButton={true} />

        {/* Page Guide */}
        <PageGuide
          title={t('to_receive.guide_title')}
          description={t('to_receive.guide_desc')}
          tips={[
            t('to_receive.tip1'),
            t('to_receive.tip2'),
            t('to_receive.tip3')
          ]}
          emoji="📥"
          show={showPageGuide}
          onClose={handleClosePageGuide}
        />

        {/* People List */}
        <main className="px-4 pt-6">
          {/* Total Summary Card - iPhone Style with #4a6850 */}
          <div className="bg-gradient-to-br from-[#e8f5e9] to-[#f1f8f4] rounded-3xl p-5 md:p-8 shadow-lg border border-[#4a6850]/10 relative overflow-hidden mb-6">
            {/* Decorative circles to match dashboard */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#4a6850]/5 rounded-full pointer-events-none"></div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#4a6850]/5 rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-[#4a6850]/10 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5 text-[#4a6850]" strokeWidth={3} />
                </div>
                <span className="text-sm text-[#4a6850]/70 font-black tracking-wide uppercase">{t('to_receive.total_amount')}</span>
              </div>
              <div className="text-4xl md:text-5xl font-black mb-3 tracking-tighter tabular-nums text-[#4a6850]">
                Rs {totalToReceive.toLocaleString()}
              </div>
              <div className="text-sm text-[#4a6850] font-bold">
                {t('to_receive.from_count_people', {
                  count: peopleWhoOweMe.length,
                  people: t(peopleWhoOweMe.length === 1 ? 'to_receive.person_singular' : 'to_receive.person_plural', { count: peopleWhoOweMe.length })
                })}
              </div>
            </div>
          </div>

          {peopleWhoOweMe.length > 0 ? (
            <div className="space-y-3">
              {peopleWhoOweMe.map((person) => (
                <div
                  key={`${person.id}-${person.groupId}`}
                  onClick={() => handlePersonClick(person)}
                  className="w-full bg-white rounded-3xl p-4 md:p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all duration-200 text-left group relative cursor-pointer"
                >
                  {/* Remind Button Overlay */}
                  <div className="absolute right-4 md:right-6 top-4 md:top-6 z-20">
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => handleRemindClick(e, person)}
                            disabled={remindingId === `${person.id}-${person.groupId}`}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#4a6850]/5 flex items-center justify-center text-[#4a6850] hover:bg-[#4a6850] hover:text-white active:scale-90 transition-all duration-300 shadow-sm disabled:opacity-50 group/remind outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-2"
                            aria-label="Send Reminder"
                          >
                            {remindingId === `${person.id}-${person.groupId}` ? (
                              <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                            ) : (
                              <Bell className="w-5 h-5 md:w-6 md:h-6 group-hover/remind:animate-bounce" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="font-medium z-[110]">
                          Send Reminder
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar name={person.name} size="md" />

                    {/* Person Info */}
                    <div className="flex-1 min-w-0 pr-12 md:pr-14">
                      <div className="flex flex-col mb-2 md:mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-gray-900 text-base md:text-lg truncate tracking-tight">{person.name}</h3>
                          {person.isTemporary && (
                            <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">{t('group.temp')}</span>
                          )}
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-[#4a6850] tabular-nums tracking-tighter">
                          Rs {person.amount.toLocaleString()}
                        </div>
                      </div>

                      {/* Contact & Payment Info Row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3 md:mb-4">
                        {person.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#4a6850]/50" />
                            <span className="text-xs text-[#4a6850]/70 font-bold">{person.phone}</span>
                          </div>
                        )}

                        {formatPaymentDetails(person.paymentDetails) && (
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#4a6850]/50" />
                            <span className="text-xs text-[#4a6850]/70 font-medium truncate max-w-[150px]">
                              {formatPaymentDetails(person.paymentDetails)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Group Info - At Bottom */}
                      <div className="flex items-center gap-2 pt-2 md:pt-3 border-t border-[#4a6850]/10">
                        <div className="w-4 h-4 md:w-5 md:h-5 bg-[#4a6850]/10 rounded-lg flex items-center justify-center">
                          <Users className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#4a6850]" />
                        </div>
                        <span className="text-xs text-[#4a6850]/80 font-black uppercase tracking-wider">{person.groupName}</span>
                        <span className="text-[10px] text-[#4a6850]/30 font-bold ml-auto">{t('to_receive.tap_to_view')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)]">
              <div className="w-16 h-16 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎉</span>
              </div>
              <h3 className="font-black text-gray-900 mb-1 tracking-tight">{t('to_receive.all_settled_up')}</h3>
              <p className="text-sm text-[#4a6850]/80 mb-4 font-bold">
                {t('to_receive.all_settled_up_desc')}
              </p>
            </div>
          )}
        </main>
      </AppContainer>
    </>
  );
};

export default ToReceive;
