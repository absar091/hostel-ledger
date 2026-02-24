import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GroupTerms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pb-8">
      {/* iPhone-style top accent border */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mobile-padding py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Group Creation Terms</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mobile-padding py-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg mb-4">
             <p className="text-sm text-emerald-800 font-medium">
                These terms are specific to creating and managing groups on Hostel Ledger. By creating a group, you agree to these responsibilities.
             </p>
          </div>

          {/* Group Creation & Management (Extracted) */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Group Creation & Administration</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Users who create groups ("Admins") bear specific responsibilities:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Lawful Purpose:</strong> Groups must not be created for illegal activities, hate speech, or harassment.</li>
              <li><strong>Member Consent:</strong> Admins should ensure that added members (especially manual ones) have consented to be tracked in the group.</li>
              <li><strong>Data Accuracy:</strong> Admins are responsible for the accuracy of the group's initial data (name, currency, etc.).</li>
              <li><strong>Dispute Resolution:</strong> The Admin serves as the primary moderator for disputes within their group. Hostel Ledger does not mediate interpersonal disagreements.</li>
            </ul>
          </section>

          {/* Invitations & Anti-Spam (Relevant to Groups) */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Invitations & Anti-Spam Policy</h2>
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-3">
              <p className="text-red-800 font-bold text-sm uppercase mb-1">Strict Policy</p>
              <p className="text-red-900 text-sm">
                We have a zero-tolerance policy for spam. Violations will result in immediate account suspension.
              </p>
            </div>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Personal Connections Only:</strong> You may ONLY invite individuals you know personally (e.g., friends, family, roommates).</li>
              <li><strong>No Unsolicited Invites:</strong> Sending invites to strangers or harvested email lists is strictly prohibited.</li>
              <li><strong>Harassment:</strong> Repeatedly sending invites to someone who has declined or ignored previous attempts is considered harassment.</li>
              <li><strong>Liability:</strong> You are solely responsible for any complaints arising from your invitations. We reserve the right to limit your ability to send invites if we detect abnormal patterns.</li>
            </ul>
          </section>

           <div className="mt-8 pt-8 border-t border-gray-100">
             <p className="text-sm text-gray-500">
               For the full Terms of Service covering the entire application, please <a href="/terms-of-service" className="text-emerald-600 underline font-semibold">click here</a>.
             </p>
           </div>

        </div>
      </div>
    </div>
  );
};

export default GroupTerms;
