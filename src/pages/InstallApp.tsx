import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Share, 
  Plus, 
  Chrome,
  Globe,
  CheckCircle,
  Zap,
  Wifi,
  Bell
} from 'lucide-react';

const InstallApp = () => {
  const { user } = useFirebaseAuth();
  const { 
    isInstallable, 
    isInstalled, 
    platform, 
    showInstallPrompt,
    isIOS,
    isAndroid,
    isDesktop
  } = usePWAInstall();
  
  const [showInstructions, setShowInstructions] = useState(false);

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to install the app</p>
          <Button 
            onClick={() => window.location.href = '/login'}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await showInstallPrompt();
    } else {
      setShowInstructions(true);
    }
  };

  const getInstallIcon = () => {
    if (isIOS) return <Globe className="w-8 h-8" />;
    if (isAndroid) return <Chrome className="w-8 h-8" />;
    return <Monitor className="w-8 h-8" />;
  };

  const getInstallText = () => {
    if (isInstallable) return 'Install App Now';
    if (isIOS) return 'Add to Home Screen';
    if (isAndroid) return 'Install App';
    return 'Install App';
  };

  const IOSInstructions = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
        <Globe className="w-8 h-8 text-emerald-600" />
        <div>
          <p className="font-semibold text-emerald-900">Safari Browser Required</p>
          <p className="text-sm text-emerald-700">Open this page in Safari to install</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
          <div>
            <p className="font-semibold text-lg">Tap the Share button</p>
            <div className="flex items-center gap-2 mt-2">
              <Share className="w-5 h-5 text-emerald-600" />
              <span className="text-gray-600">at the bottom of Safari</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
          <div>
            <p className="font-semibold text-lg">Select "Add to Home Screen"</p>
            <div className="flex items-center gap-2 mt-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              <span className="text-gray-600">Scroll down to find this option</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
          <div>
            <p className="font-semibold text-lg">Tap "Add" to install</p>
            <p className="text-gray-600 mt-1">The app will appear on your home screen</p>
          </div>
        </div>
      </div>
    </div>
  );

  const AndroidInstructions = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
        <Chrome className="w-8 h-8 text-emerald-600" />
        <div>
          <p className="font-semibold text-emerald-900">Chrome Browser Recommended</p>
          <p className="text-sm text-emerald-700">Best experience with Chrome or Edge</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
          <div>
            <p className="font-semibold text-lg">Tap the menu (⋮)</p>
            <p className="text-gray-600 mt-1">Three dots in the top-right corner</p>
          </div>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
          <div>
            <p className="font-semibold text-lg">Select "Add to Home screen"</p>
            <div className="flex items-center gap-2 mt-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              <span className="text-gray-600">Or "Install app" if available</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
          <div>
            <p className="font-semibold text-lg">Confirm installation</p>
            <p className="text-gray-600 mt-1">Tap "Add" or "Install" to complete</p>
          </div>
        </div>
      </div>
    </div>
  );

  const DesktopInstructions = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
        <Monitor className="w-8 h-8 text-emerald-600" />
        <div>
          <p className="font-semibold text-emerald-900">Desktop Installation</p>
          <p className="text-sm text-emerald-700">Available in Chrome, Edge, and other browsers</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
          <div>
            <p className="font-semibold text-lg">Look for the install icon</p>
            <div className="flex items-center gap-2 mt-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <span className="text-gray-600">In the address bar (Chrome/Edge)</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
          <div>
            <p className="font-semibold text-lg">Or use browser menu</p>
            <p className="text-gray-600 mt-1">Menu → "Install Hostel Ledger..."</p>
          </div>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
          <div>
            <p className="font-semibold text-lg">Click "Install"</p>
            <p className="text-gray-600 mt-1">The app will be added to your desktop</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-emerald-100">
            <CheckCircle className="w-20 h-20 text-emerald-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">App Installed!</h1>
            <p className="text-gray-600 mb-8">
              Hostel Ledger is now installed on your device. You can access it from your home screen or app drawer.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-lg"
            >
              Open App
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <img 
            src="/only-logo.png" 
            alt="Hostel Ledger" 
            className="w-24 h-24 mx-auto mb-6"
          />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Install Hostel Ledger</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get the full app experience with offline access, push notifications, and native performance
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100 text-center">
            <Wifi className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Works Offline</h3>
            <p className="text-gray-600">Access your expenses even without internet connection</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100 text-center">
            <Zap className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600">Native app performance with instant loading</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100 text-center">
            <Bell className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Push Notifications</h3>
            <p className="text-gray-600">Get notified about new expenses and payments</p>
          </div>
        </div>

        {/* Install Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-emerald-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {getInstallIcon()}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Install for {platform}</h2>
              <p className="text-gray-600">
                {isInstallable 
                  ? "Click the button below to install the app" 
                  : "Follow the instructions below to add to your home screen"
                }
              </p>
            </div>

            {/* Install Button */}
            <div className="text-center mb-8">
              <Button
                onClick={handleInstallClick}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Download className="w-6 h-6 mr-2" />
                {getInstallText()}
              </Button>
            </div>

            {/* Instructions */}
            {(showInstructions || !isInstallable) && (
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Installation Instructions</h3>
                {isIOS && <IOSInstructions />}
                {isAndroid && <AndroidInstructions />}
                {isDesktop && <DesktopInstructions />}
              </div>
            )}
          </div>
        </div>

        {/* Back to App */}
        <div className="text-center mt-8">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            Back to App
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallApp;