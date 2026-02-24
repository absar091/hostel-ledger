import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Privacy Policy</h1>
      </div>

      <ScrollArea className="flex-1 p-4 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6 text-gray-700 pb-20">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Information We Collect</h2>
            <p className="text-sm leading-relaxed mb-2">
              We collect information to provide and improve our expense tracking services:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Account Info:</strong> Name, email address, profile photo (optional), and username.</li>
              <li><strong>Transaction Data:</strong> Expense details, amounts, dates, locations, and notes you enter.</li>
              <li><strong>Group Data:</strong> Group names, member lists, and invitation statuses.</li>
              <li><strong>Device Info:</strong> Information about your device for PWA functionality and push notifications.</li>
              <li><strong>Device Trust Data:</strong> Information used to verify trusted devices for Two-Factor Authentication (2FA) security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. How We Use Information</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>To create and manage your account and groups.</li>
              <li>To calculate balances and generate settlement reports.</li>
              <li>To send invitations and notifications (e.g., new expenses).</li>
              <li>To sync data across your devices in real-time.</li>
            </ul>
          </section>

          <section id="group-privacy">
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Group & Invitation Privacy</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-3">
              <p className="text-blue-900 text-sm font-semibold">
                Please be aware that Hostel Ledger is a social financial tool. Transparency is key to its function.
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

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Data Sharing</h2>
            <p className="text-sm leading-relaxed">
              We do not sell your personal data. Your data is shared only with:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Group Members:</strong> Other members of your groups can see expenses, settlements, and your user profile (name, photo, email/username).</li>
              <li><strong>Financial Visibility:</strong> Members of your groups can view your wallet balance and detailed transaction history within that group. This transparency is essential for the app's shared expense functionality.</li>
              <li><strong>Service Providers:</strong> We use Firebase (Google) for secure data storage and authentication, and OneSignal for notifications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Data Security</h2>
            <p className="text-sm leading-relaxed">
              We assume strong security measures (like HTTPS and secure authentication) to protect your data. However, no method of transmission is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. PWA & Offline Data</h2>
            <p className="text-sm leading-relaxed">
              Our App functions as a Progressive Web App (PWA). Some data may be stored locally on your device to allow offline access. This data syncs with our servers when you are back online.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">7. Contact Us</h2>
            <p className="text-sm leading-relaxed">
              If you have questions about this policy, please contact us at support@hostelledger.com.
            </p>
          </section>

          <p className="text-xs text-gray-500 mt-8">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PrivacyPolicy;
