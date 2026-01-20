import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

const About = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const [showPageGuide, setShowPageGuide] = useState(false);

  useEffect(() => {
    if (shouldShowPageGuide('about')) {
      setShowPageGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleClosePageGuide = () => {
    setShowPageGuide(false);
    markPageGuideShown('about');
  };

  return (
    <div className="min-h-screen bg-white pb-8">
      {/* iPhone-style top accent border */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>
      
      {/* Page Guide */}
      <PageGuide
        title="About Hostel Ledger ℹ️"
        description="Learn more about the app, its features, and the team behind it."
        tips={[
          "Discover all the features and capabilities of Hostel Ledger",
          "Learn about AARX Labs, the company that built this app",
          "Find contact information and legal documents here"
        ]}
        emoji="📖"
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
          <h1 className="text-xl font-bold text-gray-900">About</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mobile-padding py-6 max-w-4xl mx-auto space-y-4">
        
        {/* App Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src="/only-logo.png"
              alt="Hostel Ledger"
              className="w-24 h-24 mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Hostel Ledger</h2>
            <p className="text-gray-500 text-sm">Version 1.0.0</p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">About the App</h3>
              <p className="text-gray-700 leading-relaxed">
                Hostel Ledger is a comprehensive expense tracking and group payment management application designed specifically 
                for students, roommates, and shared living communities. Track shared expenses, manage group settlements, and 
                keep your finances organized with ease.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Key Features</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Wallet management with real-time balance tracking</li>
                <li>Create groups and add members</li>
                <li>Split expenses automatically among group members</li>
                <li>Record payments and track settlements</li>
                <li>View detailed transaction history</li>
                <li>Email notifications for transactions</li>
                <li>Secure authentication and data encryption</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Developer Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Developed By</h3>
          
          <div className="flex items-center gap-4 mb-4">
            <img
              src="/aarx-logo.webp"
              alt="AARX Labs"
              className="w-16 h-16 rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <h4 className="text-lg font-bold text-gray-900">AARX Labs</h4>
              <p className="text-sm text-emerald-600 font-semibold">Innovate. Build. Launch.</p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-4">
            AARX Labs is a technology company specializing in innovative IT solutions across all domains. 
            From web and mobile applications to enterprise software, AI solutions, and digital transformation - 
            we turn ideas into reality. Our mission is to innovate cutting-edge solutions, build robust products, 
            and launch them to make a real impact.
          </p>

          <a
            href="https://aarx.online"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all"
          >
            Visit AARX Labs
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Legal Links Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate("/terms-of-service")}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <span className="font-medium text-gray-900">Terms of Service</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </button>

            <button
              onClick={() => navigate("/privacy-policy")}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <span className="font-medium text-gray-900">Privacy Policy</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Technology Stack Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Built With</h3>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">React</p>
              <p className="text-gray-500 text-xs">Frontend Framework</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">TypeScript</p>
              <p className="text-gray-500 text-xs">Type Safety</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Firebase</p>
              <p className="text-gray-500 text-xs">Backend & Auth</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Tailwind CSS</p>
              <p className="text-gray-500 text-xs">Styling</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Cloudinary</p>
              <p className="text-gray-500 text-xs">Image Storage</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Vercel</p>
              <p className="text-gray-500 text-xs">Hosting</p>
            </div>
          </div>
        </div>

        {/* Contact Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Contact & Support</h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-600 text-sm">📧</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Email</p>
                <a href="mailto:support@aarx.online" className="text-emerald-600 hover:text-emerald-700 text-sm">
                  support@aarx.online
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-600 text-sm">🌐</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Website</p>
                <a 
                  href="https://aarx.online" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-emerald-600 hover:text-emerald-700 text-sm"
                >
                  aarx.online
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>© 2026 AARX Labs. All rights reserved.</p>
          <p className="mt-1">Made with ❤️ for students and shared living communities</p>
        </div>

      </div>
    </div>
  );
};

export default About;
