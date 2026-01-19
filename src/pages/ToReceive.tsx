import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowDownLeft, Users, User, Phone, CreditCard } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import Avatar from "@/components/Avatar";

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
}

const ToReceive = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { groups } = useFirebaseData();
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
    if (!user) return [];
    
    const people: PersonToReceiveFrom[] = [];

    // Use the settlements system from FirebaseAuth context
    groups.forEach((group) => {
      const currentUserMember = group.members.find((m) => m.isCurrentUser);
      if (!currentUserMember) return;

      group.members.forEach((member) => {
        if (member.isCurrentUser) return;

        // Get settlements for this specific group and person
        const settlements = user.settlements?.[group.id]?.[member.id];
        if (settlements && settlements.toReceive > 0) {
          people.push({
            id: member.id,
            name: member.name,
            amount: settlements.toReceive,
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

  const totalToReceive = peopleWhoOweMe.reduce((sum, person) => sum + person.amount, 0);

  const handlePersonClick = (person: PersonToReceiveFrom) => {
    // Navigate to group detail page
    navigate(`/group/${person.groupId}`);
  };

  const formatPaymentDetails = (paymentDetails?: PersonToReceiveFrom['paymentDetails']) => {
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
        title="Money to Receive "
        description="Here are all the people who owe you money across your groups. Tap on anyone to view group details."
        tips={[
          "Amounts are calculated automatically from group expenses",
          "Tap on a person to go to their group and record payments",
          "Payment details help you know how to receive money"
        ]}
        emoji=""
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
          <h1 className="text-2xl font-bold text-gray-900">Money to Receive</h1>
        </div>

        {/* Total Summary Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft className="w-5 h-5 text-white/80" />
            <span className="text-sm text-white/80">Total Amount</span>
          </div>
          <div className="text-4xl font-bold mb-2">
            Rs {totalToReceive.toLocaleString()}
          </div>
          <div className="text-sm text-white/90">
            From {peopleWhoOweMe.length} {peopleWhoOweMe.length === 1 ? 'person' : 'people'}
          </div>
        </div>
      </header>

      {/* People List */}
      <main className="px-4">
        {peopleWhoOweMe.length > 0 ? (
          <div className="space-y-3">
            {peopleWhoOweMe.map((person) => (
              <button
                key={`${person.id}-${person.groupId}`}
                onClick={() => handlePersonClick(person)}
                className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar name={person.name} size="md" />
                  
                  {/* Person Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg truncate">{person.name}</h3>
                      <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                        Rs {person.amount.toLocaleString()}
                      </div>
                    </div>
                    
                    {/* Contact Info */}
                    {person.phone && (
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{person.phone}</span>
                      </div>
                    )}

                    {/* Payment Details */}
                    {formatPaymentDetails(person.paymentDetails) && (
                      <div className="flex items-start gap-2 mb-3">
                        <CreditCard className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600 leading-relaxed">
                          {formatPaymentDetails(person.paymentDetails)}
                        </span>
                      </div>
                    )}

                    {/* Group Info - At Bottom */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <div className="w-5 h-5 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                        <Users className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{person.groupName}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">Tap to view group</span>
                    </div>
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
            <h3 className="font-semibold text-gray-900 mb-1">All Settled Up!</h3>
            <p className="text-sm text-gray-500 mb-4">
              Nobody owes you money right now. Great job keeping things balanced!
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ToReceive;