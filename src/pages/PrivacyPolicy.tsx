import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const [showPageGuide, setShowPageGuide] = useState(false);

  useEffect(() => {
    if (shouldShowPageGuide('privacy-policy')) {
      setShowPageGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleClosePageGuide = () => {
    setShowPageGuide(false);
    markPageGuideShown('privacy-policy');
  };

  return (
    <div className="min-h-screen bg-white pb-8">
      {/* iPhone-style top accent border */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>
      
      {/* Page Guide */}
      <PageGuide
        title="Privacy Policy 🔒"
        description="Learn how we protect your data and what information we collect to provide our services."
        tips={[
          "We use industry-standard security measures to protect your data",
          "Your financial information is encrypted and never shared with third parties",
          "You can delete your account and all data at any time"
        ]}
        emoji="🛡️"
        show={showPageGuide}
        onClose={handleClosePageGuide}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mobile-padding py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Privacy Policy</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mobile-padding py-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          
          {/* Last Updated */}
          <div className="text-sm text-gray-500">
            Last Updated: January 15, 2026
          </div>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              Welcome to Hostel Ledger. We are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our expense tracking 
              and group payment management application.
            </p>
          </section>

          {/* Developer Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">About Us</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Hostel Ledger is developed and maintained by <strong>AARX Labs</strong>, a technology company specializing 
              in innovative IT solutions across all domains - from web and mobile applications to enterprise software, 
              AI solutions, and digital transformation.
            </p>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong>Our Mission:</strong> Innovate. Build. Launch.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Website:</strong>{" "}
              <a href="https://aarx.online" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">
                aarx.online
              </a>
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Personal Information</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li><strong>Account Information:</strong> Name, email address, phone number (optional)</li>
              <li><strong>Profile Picture:</strong> Optional profile photo uploaded by you</li>
              <li><strong>Payment Details:</strong> JazzCash, Easypaisa, bank account details, Raast ID (stored locally, not shared)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Financial Data</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li><strong>Wallet Balance:</strong> Your available budget and transaction history</li>
              <li><strong>Group Expenses:</strong> Shared expenses, split amounts, and payment records</li>
              <li><strong>Settlement Information:</strong> Amounts owed and receivable within groups</li>
              <li><strong>Transaction Notes:</strong> Descriptions and details you add to expenses and payments</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Usage Information</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li><strong>Device Information:</strong> Browser type, device type, operating system</li>
              <li><strong>Log Data:</strong> IP address, access times, pages viewed</li>
              <li><strong>Cookies:</strong> Session cookies for authentication and preferences</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Provide Services:</strong> Enable expense tracking, group management, and payment settlements</li>
              <li><strong>Account Management:</strong> Create and maintain your account, authenticate users</li>
              <li><strong>Email Notifications:</strong> Send transaction alerts, payment reminders, and account updates</li>
              <li><strong>Improve Services:</strong> Analyze usage patterns to enhance app functionality</li>
              <li><strong>Security:</strong> Detect and prevent fraud, unauthorized access, and security threats</li>
              <li><strong>Customer Support:</strong> Respond to your inquiries and provide assistance</li>
            </ul>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Data Storage and Security</h2>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Storage Infrastructure</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li><strong>Firebase Realtime Database:</strong> User profiles, groups, transactions, and settlements</li>
              <li><strong>Firebase Authentication:</strong> Secure email/password authentication</li>
              <li><strong>Cloudinary:</strong> Profile pictures (encrypted and access-controlled)</li>
              <li><strong>Vercel:</strong> Application hosting with SSL/TLS encryption</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Measures</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>End-to-end HTTPS encryption for all data transmission</li>
              <li>Firebase Security Rules to restrict unauthorized access</li>
              <li>Email verification required for account activation</li>
              <li>Password reset with secure token-based authentication</li>
              <li>Regular security audits and updates</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Data Sharing and Disclosure</h2>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Within Groups</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              When you join a group, other group members can see:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>Your name and profile picture</li>
              <li>Your payment details (if you choose to add them)</li>
              <li>Expenses you've added and payments you've made within the group</li>
              <li>Your balance with each group member</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Third-Party Services</h3>
            <p className="text-gray-700 leading-relaxed mb-2">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li><strong>Firebase (Google):</strong> Authentication, database, and hosting</li>
              <li><strong>Cloudinary:</strong> Image storage and optimization</li>
              <li><strong>Vercel:</strong> Application hosting and deployment</li>
              <li><strong>Email Service Provider:</strong> Transaction notifications and alerts</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">We Do NOT:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Sell your personal information to third parties</li>
              <li>Share your financial data with advertisers</li>
              <li>Use your data for marketing purposes without consent</li>
              <li>Access your payment app accounts (JazzCash, Easypaisa, etc.)</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Your Rights and Choices</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Access:</strong> View and download your personal data</li>
              <li><strong>Update:</strong> Edit your profile information, payment details, and preferences</li>
              <li><strong>Delete:</strong> Request account deletion (removes all your data permanently)</li>
              <li><strong>Export:</strong> Download your transaction history and group data</li>
              <li><strong>Opt-Out:</strong> Disable email notifications in settings</li>
              <li><strong>Withdraw Consent:</strong> Remove payment details or profile picture anytime</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Data Retention</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              We retain your information for as long as your account is active or as needed to provide services:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Active Accounts:</strong> Data retained indefinitely while account is active</li>
              <li><strong>Deleted Accounts:</strong> Data permanently deleted within 30 days of account deletion</li>
              <li><strong>Transaction History:</strong> Retained for 7 years for financial record-keeping</li>
              <li><strong>Backup Data:</strong> Removed from backups within 90 days of deletion</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Hostel Ledger is intended for users aged 13 and above. We do not knowingly collect personal information from 
              children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          {/* International Users */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">International Users</h2>
            <p className="text-gray-700 leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate 
              safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or 
              in-app notification. Your continued use of Hostel Ledger after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-gray-700">
                <strong>AARX Labs</strong>
              </p>
              <p className="text-gray-700">
                Website:{" "}
                <a href="https://aarx.online" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">
                  aarx.online
                </a>
              </p>
              <p className="text-gray-700">
                Email:{" "}
                <a href="mailto:support@aarx.online" className="text-emerald-600 hover:text-emerald-700 underline">
                  support@aarx.online
                </a>
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
