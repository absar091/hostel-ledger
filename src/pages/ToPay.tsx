import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Users, Phone, CreditCard } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import AppContainer from "@/components/AppContainer";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import Avatar from "@/components/Avatar";

interface PersonToPay {
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

const ToPay = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { groups } = useFirebaseData();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const [showPageGuide, setShowPageGuide] = useState(false);

  useEffect(() => {
    if (shouldShowPageGuide('to-pay')) {
      setShowPageGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleClosePageGuide = () => {
    setShowPageGuide(false);
    markPageGuideShown('to-pay');
  };

  // Calculate people the current user owes money to
  const peopleIOwe = useMemo(() => {
    if (!user || !user.settlements) return [];

    const people: PersonToPay[] = [];

    // Iterate over settlements in the user profile
    Object.entries(user.settlements).forEach(([groupId, groupSettlements]) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      Object.entries(groupSettlements).forEach(([memberId, settlements]) => {
        if (settlements.toPay > 0) {
          // Find member name in the group's members list (if loaded)
          const member = group.members.find(m => m.id === memberId);

          people.push({
            id: memberId,
            name: member?.name || `Member (${memberId.substring(0, 5)})`,
            amount: settlements.toPay,
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
  }, [groups, user]);

  const totalToPay = peopleIOwe.reduce((sum, person) => sum + person.amount, 0);

  const handlePersonClick = (person: PersonToPay) => {
    // Navigate to group detail page
    navigate(`/group/${person.groupId}`);
  };

  const formatPaymentDetails = (paymentDetails?: PersonToPay['paymentDetails']) => {
    if (!paymentDetails) return null;

    const details = [];
    if (paymentDetails.jazzCash) details.push(`JazzCash: ${paymentDetails.jazzCash}`);
    if (paymentDetails.easypaisa) details.push(`Easypaisa: ${paymentDetails.easypaisa}`);
    if (paymentDetails.bankName && paymentDetails.accountNumber) {
      details.push(`${paymentDetails.bankName}: ${paymentDetails.accountNumber}`);
    }
    if (paymentDetails.raastId) details.push(`Raast ID: ${paymentDetails.raastId}`);

    return details.length > 0 ? details.join(" • ") : null;
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar />

      <AppContainer className="bg-white pb-8">
        {/* Desktop Header */}
        <DesktopHeader />

        {/* iPhone-style top accent border - Mobile only */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>

        {/* App Header - iPhone Style Enhanced with #4a6850 */}
        <div className="bg-white border-b border-[#4a6850]/10 pt-2 pb-3 px-4 sticky top-0 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
          <div className="flex items-center justify-between">
            {/* App Logo and Name - Enhanced */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-2xl flex items-center justify-center shadow-lg">
                <img
                  src="/only-logo.png"
                  alt="Hostel Ledger"
                  className="w-6 h-6 object-contain filter brightness-0 invert"
                />
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Hostel Ledger</h1>
            </div>

            {/* Header Actions - Enhanced */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl flex items-center justify-center shadow-lg">
                <ArrowUpRight className="w-7 h-7 text-white font-bold" />
              </div>
            </div>
          </div>
        </div>

        {/* Page Guide */}
        <PageGuide
          title="Money to Pay 💳"
          description="Here are all the people you owe money to across your groups. Tap on anyone to view group details and make payments."
          tips={[
            "Amounts are calculated automatically from group expenses",
            "Tap on a person to go to their group and record payments",
            "Payment details show you how to send money to them"
          ]}
          emoji="📤"
          show={showPageGuide}
          onClose={handleClosePageGuide}
        />

        {/* Header - iPhone Style Enhanced */}
        <header className="px-4 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-2xl bg-[#4a6850]/10 shadow-sm border border-[#4a6850]/20 flex items-center justify-center hover:bg-[#4a6850]/20 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-[#4a6850] font-bold" />
            </button>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Money to Pay</h1>
          </div>

          {/* Total Summary Card - iPhone Style with Greenish-Gray Theme */}
          <div className="bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl p-7 shadow-[0_25px_70px_rgba(74,104,80,0.4)] text-white border-t-2 border-[#5a7860]/40">
            <div className="flex items-center gap-3 mb-2">
              <ArrowUpRight className="w-6 h-6 text-white/90 font-bold" />
              <span className="text-sm text-white/90 font-black tracking-wide uppercase">Total Amount</span>
            </div>
            <div className="text-5xl font-black mb-3 tracking-tighter tabular-nums drop-shadow-sm">
              Rs {totalToPay.toLocaleString()}
            </div>
            <div className="text-sm text-white/90 font-bold">
              To {peopleIOwe.length} {peopleIOwe.length === 1 ? 'person' : 'people'}
            </div>
          </div>
        </header>

        {/* People List */}
        <main className="px-4">
          {peopleIOwe.length > 0 ? (
            <div className="space-y-3">
              {peopleIOwe.map((person) => (
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
                            <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">Temp</span>
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
                        <span className="text-xs text-[#4a6850]/60 font-bold">Tap to view group</span>
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
              <h3 className="font-black text-gray-900 mb-1 tracking-tight">All Paid Up!</h3>
              <p className="text-sm text-[#4a6850]/80 mb-4 font-bold">
                You don't owe anyone money right now. Keep up the good work!
              </p>
            </div>
          )}
        </main>
      </AppContainer>
    </>
  );
};

export default ToPay;