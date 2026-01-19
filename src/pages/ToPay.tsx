import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Users, User, Phone, CreditCard } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
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
    if (!user) return [];
    
    const people: PersonToPay[] = [];

    // Use the settlements system from FirebaseAuth context
    groups.forEach((group) => {
      const currentUserMember = group.members.find((m) => m.isCurrentUser);
      if (!currentUserMember) return;

      group.members.forEach((member) => {
        if (member.isCurrentUser) return;

        // Get settlements for this specific group and person
        const settlements = user.settlements?.[group.id]?.[member.id];
        if (settlements && settlements.toPay > 0) {
          people.push({
            id: member.id,
            name: member.name,
            amount: settlements.toPay,
            groupId: group.id,
            groupName: group.name,
            phone: member.phone,
            paymentDetails: member.paymentDetails,
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 pb-8">
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

      {/* Header */}
      <header className="px-4 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Money to Pay</h1>
        </div>

        {/* Total Summary Card */}
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-5 h-5 text-white/80" />
            <span className="text-sm text-white/80">Total Amount</span>
          </div>
          <div className="text-4xl font-bold mb-2">
            Rs {totalToPay.toLocaleString()}
          </div>
          <div className="text-sm text-white/90">
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
                className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all duration-200 text-left"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <Avatar name={person.name} size="md" />
                  
                  {/* Person Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{person.name}</h3>
                      <div className="text-xl font-bold text-orange-600 tabular-nums">
                        Rs {person.amount.toLocaleString()}
                      </div>
                    </div>
                    
                    {/* Group Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-sm text-gray-500 truncate">{person.groupName}</span>
                    </div>

                    {/* Contact Info */}
                    {person.phone && (
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-500">{person.phone}</span>
                      </div>
                    )}

                    {/* Payment Details */}
                    {formatPaymentDetails(person.paymentDetails) && (
                      <div className="flex items-start gap-2">
                        <CreditCard className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-500 leading-relaxed">
                          {formatPaymentDetails(person.paymentDetails)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">All Paid Up!</h3>
            <p className="text-sm text-gray-500 mb-4">
              You don't owe anyone money right now. Keep up the good work!
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ToPay;