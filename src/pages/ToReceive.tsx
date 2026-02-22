import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowDownLeft, Users, Phone, CreditCard } from "lucide-react";
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
          <div className="bg-gradient-to-br from-[#e8f5e9] to-[#f1f8f4] rounded-3xl p-8 shadow-lg border border-[#4a6850]/10 relative overflow-hidden mb-6">
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
              <div className="text-5xl font-black mb-3 tracking-tighter tabular-nums text-[#4a6850]">
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
                <button
                  key={`${person.id}-${person.groupId}`}
                  onClick={() => handlePersonClick(person)}
                  className="w-full bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all duration-200 text-left group"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar name={person.name} size="md" />

                    {/* Person Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-gray-900 text-lg truncate tracking-tight">{person.name}</h3>
                          {person.isTemporary && (
                            <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">{t('group.temp')}</span>
                          )}
                        </div>
                        <div className="text-2xl font-black text-[#4a6850] tabular-nums">
                          Rs {person.amount.toLocaleString()}
                        </div>
                      </div>

                      {/* Contact Info */}
                      {person.phone && (
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="w-4 h-4 text-[#4a6850]/60" />
                          <span className="text-sm text-[#4a6850]/80 font-bold">{person.phone}</span>
                        </div>
                      )}

                      {/* Payment Details */}
                      {formatPaymentDetails(person.paymentDetails) && (
                        <div className="flex items-start gap-2 mb-3">
                          <CreditCard className="w-4 h-4 text-[#4a6850]/60 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[#4a6850]/80 leading-relaxed font-medium">
                            {formatPaymentDetails(person.paymentDetails)}
                          </span>
                        </div>
                      )}

                      {/* Group Info - At Bottom */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#4a6850]/10">
                        <div className="w-5 h-5 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-lg flex items-center justify-center">
                          <Users className="w-3 h-3 text-[#4a6850] font-bold" />
                        </div>
                        <span className="text-xs text-[#4a6850]/80 font-black">{person.groupName}</span>
                        <span className="text-xs text-[#4a6850]/40 font-bold">•</span>
                        <span className="text-xs text-[#4a6850]/60 font-bold">{t('to_receive.tap_to_view')}</span>
                      </div>
                    </div>
                  </div>
                </button>
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
