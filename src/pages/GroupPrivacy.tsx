import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GroupPrivacy = () => {
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
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Group Privacy Policy</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mobile-padding py-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-4">
             <p className="text-sm text-blue-800 font-medium">
                This privacy policy section specifically covers how data is shared and visible within groups. Transparency is key to our expense tracking service.
             </p>
          </div>

          {/* Group & Invitation Privacy (Extracted) */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Group & Invitation Privacy</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-3">
              <p className="text-blue-900 text-sm font-semibold">
                Please be aware that Hostel Ledger is a social financial tool.
              </p>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
              <li><strong>Invitation Visibility:</strong> When you send an invitation (via email or link), the recipient will see your name, profile photo, and username so they know who is inviting them.</li>
              <li><strong>Group Transparency:</strong>
                <span className="block mt-1 text-gray-600">
                  By joining a group, you consent to share your financial interactions within that group. All group members can view:
                  <ul className="list-circle pl-5 mt-1 space-y-1">
                    <li>Your wallet balance relevant to the group.</li>
                    <li>Expenses you add or are involved in.</li>
                    <li>Settlements you make.</li>
                  </ul>
                </span>
              </li>
              <li><strong>Manual Members:</strong> If you add "manual" members (users without an account), you are responsible for their data privacy and must ensure you have their permission to track their expenses.</li>
            </ul>
          </section>

          {/* Data Sharing (Relevant to Groups) */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Data Sharing in Groups</h2>
            <p className="text-sm leading-relaxed">
              We do not sell your personal data. Within groups, your data is shared with:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Group Members:</strong> Other members of your groups can see expenses, settlements, and your user profile (name, photo, email/username).</li>
              <li><strong>Financial Visibility:</strong> Members of your groups can view your wallet balance and detailed transaction history within that group. This transparency is essential for the app's shared expense functionality.</li>
            </ul>
          </section>

           <div className="mt-8 pt-8 border-t border-gray-100">
             <p className="text-sm text-gray-500">
               For the full Privacy Policy covering all data collection and usage, please <a href="/privacy-policy" className="text-blue-600 underline font-semibold">click here</a>.
             </p>
           </div>

        </div>
      </div>
    </div>
  );
};

export default GroupPrivacy;
