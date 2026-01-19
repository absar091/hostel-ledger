import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

const TermsOfService = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const [showPageGuide, setShowPageGuide] = useState(false);

  useEffect(() => {
    if (shouldShowPageGuide('terms-of-service')) {
      setShowPageGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleClosePageGuide = () => {
    setShowPageGuide(false);
    markPageGuideShown('terms-of-service');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 pb-8">
      {/* Page Guide */}
      <PageGuide
        title="Terms of Service 📋"
        description="Important legal information about using Hostel Ledger and your rights and responsibilities."
        tips={[
          "These terms explain how you can use Hostel Ledger safely and legally",
          "Remember: Hostel Ledger is a tracking tool, not a payment processor",
          "You're responsible for the accuracy of your expense and payment data"
        ]}
        emoji="⚖️"
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
          <h1 className="text-xl font-bold text-gray-900">Terms of Service</h1>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Agreement to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              Welcome to Hostel Ledger! These Terms of Service ("Terms") govern your access to and use of the Hostel Ledger 
              application, website, and services (collectively, the "Service") provided by AARX Labs. By accessing or using 
              our Service, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Service.
            </p>
          </section>

          {/* About the Service */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">About Hostel Ledger</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Hostel Ledger is an expense tracking and group payment management application designed for students, roommates, 
              and shared living communities. The Service is developed and operated by:
            </p>
            <div className="bg-emerald-50 rounded-lg p-4 space-y-2">
              <p className="text-gray-700">
                <strong>AARX Labs</strong>
              </p>
              <p className="text-gray-700 text-sm">
                <em>Innovate. Build. Launch.</em>
              </p>
              <p className="text-gray-700 text-sm">
                A technology company specializing in innovative IT solutions across all domains.
              </p>
              <p className="text-gray-700">
                Website:{" "}
                <a href="https://aarx.online" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">
                  aarx.online
                </a>
              </p>
            </div>
          </section>

          {/* Eligibility */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Eligibility</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              To use Hostel Ledger, you must:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Be at least 13 years of age</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Not be prohibited from using the Service under applicable laws</li>
            </ul>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Account Registration and Security</h2>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating an Account</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>You must provide a valid email address and create a secure password</li>
              <li>Email verification is required to activate your account</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You must notify us immediately of any unauthorized access to your account</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Responsibilities</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>You are solely responsible for all activities under your account</li>
              <li>You must not share your account with others</li>
              <li>You must keep your contact information up to date</li>
              <li>You must not create multiple accounts for fraudulent purposes</li>
            </ul>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Service Description</h2>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Features</h3>
            <p className="text-gray-700 leading-relaxed mb-2">
              Hostel Ledger provides the following features:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li><strong>Wallet Management:</strong> Track your available budget and add money to your wallet</li>
              <li><strong>Group Creation:</strong> Create groups with friends, roommates, or housemates</li>
              <li><strong>Expense Tracking:</strong> Add shared expenses and split them among group members</li>
              <li><strong>Payment Recording:</strong> Record payments received from group members</li>
              <li><strong>Settlement Tracking:</strong> View who owes you and whom you owe</li>
              <li><strong>Transaction History:</strong> Access detailed history of all expenses and payments</li>
              <li><strong>Email Notifications:</strong> Receive alerts for transactions and payments</li>
              <li><strong>Payment Details:</strong> Store payment information (JazzCash, Easypaisa, bank details)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Important Clarifications</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
              <p className="text-gray-700 font-semibold">Hostel Ledger is a TRACKING tool, NOT a payment processor:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>We do NOT process actual money transfers</li>
                <li>We do NOT integrate with JazzCash, Easypaisa, or banking systems</li>
                <li>We do NOT hold, transfer, or manage your funds</li>
                <li>All actual payments must be made outside the app using your preferred method</li>
                <li>The app only helps you TRACK and RECORD these payments</li>
              </ul>
            </div>
          </section>

          {/* User Conduct */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">User Conduct and Prohibited Activities</h2>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">You agree NOT to:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Infringe upon the rights of others</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Scrape, harvest, or collect user data without permission</li>
              <li>Impersonate another person or entity</li>
              <li>Create fake expenses or fraudulent transactions</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Use the Service for commercial purposes without authorization</li>
            </ul>
          </section>

          {/* Data Accuracy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Data Accuracy and User Responsibility</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong>You are responsible for:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>Ensuring all expense amounts and transaction details are accurate</li>
              <li>Verifying payment information before recording transactions</li>
              <li>Resolving disputes with group members directly</li>
              <li>Maintaining accurate records of actual payments made outside the app</li>
              <li>Reconciling your wallet balance with your actual funds</li>
            </ul>

            <p className="text-gray-700 leading-relaxed">
              <strong>We are NOT responsible for:</strong> Errors in data entry, disputes between users, lost funds due to 
              incorrect payment details, or discrepancies between app records and actual payments.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Intellectual Property Rights</h2>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Rights</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Service, including its design, features, code, graphics, and content, is owned by AARX Labs and protected 
              by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create 
              derivative works without our express written permission.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Content</h3>
            <p className="text-gray-700 leading-relaxed">
              You retain ownership of any content you upload (profile pictures, transaction notes, etc.). By uploading content, 
              you grant us a license to use, store, and display it as necessary to provide the Service.
            </p>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Privacy and Data Protection</h2>
            <p className="text-gray-700 leading-relaxed">
              Your privacy is important to us. Our collection and use of personal information is governed by our{" "}
              <button
                onClick={() => navigate("/privacy-policy")}
                className="text-emerald-600 hover:text-emerald-700 underline font-semibold"
              >
                Privacy Policy
              </button>
              . By using the Service, you consent to our data practices as described in the Privacy Policy.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Disclaimers and Limitations</h2>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Service "As Is"</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied. 
              We do not guarantee that the Service will be uninterrupted, error-free, or secure.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Financial Advice</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Hostel Ledger is a tracking tool only. We do not provide financial, legal, or tax advice. Consult appropriate 
              professionals for financial guidance.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">Third-Party Services</h3>
            <p className="text-gray-700 leading-relaxed">
              We use third-party services (Firebase, Cloudinary, email providers) to operate the Service. We are not responsible 
              for the availability, security, or practices of these third-party services.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              To the maximum extent permitted by law, AARX Labs and its affiliates shall not be liable for:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Any indirect, incidental, special, or consequential damages</li>
              <li>Loss of profits, data, or business opportunities</li>
              <li>Damages arising from unauthorized access to your account</li>
              <li>Errors or inaccuracies in transaction records</li>
              <li>Disputes between users</li>
              <li>Loss of funds due to incorrect payment information</li>
              <li>Service interruptions or data loss</li>
            </ul>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Indemnification</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to indemnify and hold harmless AARX Labs, its officers, directors, employees, and agents from any 
              claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Service, 
              violation of these Terms, or infringement of any rights of another party.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Termination</h2>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">By You</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You may delete your account at any time through the app settings. Upon deletion, your data will be permanently 
              removed within 30 days.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">By Us</h3>
            <p className="text-gray-700 leading-relaxed mb-2">
              We may suspend or terminate your account if:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>You violate these Terms</li>
              <li>You engage in fraudulent or illegal activities</li>
              <li>Your account has been inactive for an extended period</li>
              <li>We are required to do so by law</li>
              <li>We discontinue the Service</li>
            </ul>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Changes to These Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of significant changes via email 
              or in-app notification. Your continued use of the Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Governing Law and Dispute Resolution</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms shall be governed by and construed in accordance with the laws of Pakistan, without regard to its 
              conflict of law provisions.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Any disputes arising from these Terms or your use of the Service shall be resolved through good faith negotiations. 
              If negotiations fail, disputes shall be subject to the exclusive jurisdiction of the courts of Pakistan.
            </p>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Severability</h2>
            <p className="text-gray-700 leading-relaxed">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue 
              in full force and effect.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              If you have questions about these Terms, please contact us:
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

          {/* Acknowledgment */}
          <section className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-gray-700 leading-relaxed">
              <strong>By using Hostel Ledger, you acknowledge that you have read, understood, and agree to be bound by these 
              Terms of Service.</strong>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
