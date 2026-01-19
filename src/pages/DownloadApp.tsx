import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, 
  Zap, 
  Bell, 
  Wifi, 
  Download,
  CheckCircle2,
  ArrowRight,
  X
} from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import PageGuide from "@/components/PageGuide";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const DownloadApp = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showPageGuide, setShowPageGuide] = useState(false);

  useEffect(() => {
    if (shouldShowPageGuide('download-app')) {
      setShowPageGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleClosePageGuide = () => {
    setShowPageGuide(false);
    markPageGuideShown('download-app');
  };

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      // Already installed, redirect to dashboard
      navigate('/');
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [navigate]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // If no install prompt, just go to dashboard
      navigate('/');
      return;
    }

    setIsInstalling(true);

    try {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        // Redirect to dashboard after successful install
        setTimeout(() => navigate('/'), 1000);
      } else {
        console.log('User dismissed the install prompt');
        setIsInstalling(false);
      }

      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Install error:', error);
      setIsInstalling(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      {/* Page Guide */}
      <PageGuide
        title="Install the App 📱"
        description="Get the best experience by installing Hostel Ledger as a native app on your device."
        tips={[
          "Installing the app gives you faster loading and offline access",
          "You'll get push notifications for important updates",
          "The app works just like any other app on your phone"
        ]}
        emoji="⬇️"
        show={showPageGuide}
        onClose={handleClosePageGuide}
      />

      <div className="w-full max-w-2xl">
        {/* Skip Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-2 text-sm"
          >
            Skip for now
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-8 text-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-white/30">
              <Smartphone className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Get the Best Experience</h1>
            <p className="text-white/90 text-lg">
              Install Hostel Ledger on your device for faster access and better performance
            </p>
          </div>

          {/* Features Grid */}
          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Feature 1 */}
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-200">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Lightning Fast</h3>
                  <p className="text-sm text-gray-600">
                    Instant loading and smooth performance like a native app
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-200">
                  <Wifi className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Works Offline</h3>
                  <p className="text-sm text-gray-600">
                    Access your data even without internet connection
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-200">
                  <Bell className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Push Notifications</h3>
                  <p className="text-sm text-gray-600">
                    Get instant alerts for payments and settlements
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">One-Tap Access</h3>
                  <p className="text-sm text-gray-600">
                    Launch directly from your home screen
                  </p>
                </div>
              </div>
            </div>

            {/* Installation Steps */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 mb-8 border border-emerald-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                How to Install
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-sm text-gray-700 pt-0.5">
                    Click the "Install App" button below
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-sm text-gray-700 pt-0.5">
                    Confirm the installation when prompted by your browser
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-sm text-gray-700 pt-0.5">
                    Find Hostel Ledger on your home screen and enjoy!
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-lg shadow-xl"
              >
                {isInstalling ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Installing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Install App
                  </div>
                )}
              </Button>
              
              <Button
                onClick={handleSkip}
                variant="outline"
                className="flex-1 h-14 border-2 text-gray-700 font-semibold text-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  Continue in Browser
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Button>
            </div>

            {/* Info Text */}
            <p className="text-center text-sm text-gray-500 mt-6">
              {isInstallable 
                ? "Installing the app takes just a few seconds and uses minimal storage"
                : "Your browser doesn't support app installation, but you can still use Hostel Ledger in your browser"}
            </p>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Welcome, <span className="font-semibold text-emerald-600">{user?.name}</span>! 👋
          </p>
        </div>
      </div>
    </div>
  );
};

export default DownloadApp;
