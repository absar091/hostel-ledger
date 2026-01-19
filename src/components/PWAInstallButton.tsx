import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Share, 
  Plus, 
  X,
  Chrome,
  Globe,
  Edge
} from 'lucide-react';

const PWAInstallButton = () => {
  const { user } = useFirebaseAuth();
  const { 
    isInstallable, 
    isInstalled, 
    platform, 
    showInstallPrompt, 
    dismissPrompt,
    isIOS,
    isAndroid,
    isDesktop
  } = usePWAInstall();
  
  const [showInstructions, setShowInstructions] = useState(false);

  // Only show for authenticated users
  if (!user) return null;

  // Don't show if already installed
  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      // Show native install prompt for supported browsers
      await showInstallPrompt();
    } else {
      // Navigate to dedicated install page
      window.location.href = '/install-app';
    }
  };

  const getInstallIcon = () => {
    if (isIOS) return <Globe className="w-5 h-5" />;
    if (isAndroid) return <Chrome className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  const getInstallText = () => {
    if (isInstallable) return 'Install App';
    if (isIOS) return 'Add to Home Screen';
    if (isAndroid) return 'Install App';
    return 'Install App';
  };

  const IOSInstructions = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
        <Globe className="w-6 h-6 text-emerald-600" />
        <div>
          <p className="font-medium text-emerald-900">Safari Browser Required</p>
          <p className="text-sm text-emerald-700">Open this page in Safari to install</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
          <div>
            <p className="font-medium">Tap the Share button</p>
            <div className="flex items-center gap-2 mt-1">
              <Share className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-gray-600">at the bottom of Safari</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
          <div>
            <p className="font-medium">Select "Add to Home Screen"</p>
            <div className="flex items-center gap-2 mt-1">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-gray-600">Scroll down to find this option</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
          <div>
            <p className="font-medium">Tap "Add" to install</p>
            <p className="text-sm text-gray-600">The app will appear on your home screen</p>
          </div>
        </div>
      </div>
    </div>
  );

  const AndroidInstructions = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
        <Chrome className="w-6 h-6 text-emerald-600" />
        <div>
          <p className="font-medium text-emerald-900">Chrome Browser Recommended</p>
          <p className="text-sm text-emerald-700">Best experience with Chrome or Edge</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
          <div>
            <p className="font-medium">Tap the menu (⋮)</p>
            <p className="text-sm text-gray-600">Three dots in the top-right corner</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
          <div>
            <p className="font-medium">Select "Add to Home screen"</p>
            <div className="flex items-center gap-2 mt-1">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-gray-600">Or "Install app" if available</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
          <div>
            <p className="font-medium">Confirm installation</p>
            <p className="text-sm text-gray-600">Tap "Add" or "Install" to complete</p>
          </div>
        </div>
      </div>
    </div>
  );

  const DesktopInstructions = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
        <Monitor className="w-6 h-6 text-emerald-600" />
        <div>
          <p className="font-medium text-emerald-900">Desktop Installation</p>
          <p className="text-sm text-emerald-700">Available in Chrome, Edge, and other browsers</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
          <div>
            <p className="font-medium">Look for the install icon</p>
            <div className="flex items-center gap-2 mt-1">
              <Download className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-gray-600">In the address bar (Chrome/Edge)</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
          <div>
            <p className="font-medium">Or use browser menu</p>
            <p className="text-sm text-gray-600">Menu → "Install Hostel Ledger..."</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
          <div>
            <p className="font-medium">Click "Install"</p>
            <p className="text-sm text-gray-600">The app will be added to your desktop</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Install Button */}
      <Button
        onClick={handleInstallClick}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200 hover:from-emerald-100 hover:to-emerald-200 text-emerald-700 hover:text-emerald-800 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        {getInstallIcon()}
        <span className="hidden sm:inline">{getInstallText()}</span>
        <Download className="w-4 h-4 sm:hidden" />
      </Button>

      {/* Installation Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Install Hostel Ledger
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstructions(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <DialogDescription>
              Get the full app experience with offline access and push notifications
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {isIOS && <IOSInstructions />}
            {isAndroid && <AndroidInstructions />}
            {isDesktop && <DesktopInstructions />}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Why install?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Works offline</li>
              <li>• Faster loading</li>
              <li>• Push notifications</li>
              <li>• Native app experience</li>
            </ul>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowInstructions(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => setShowInstructions(false)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Got It!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PWAInstallButton;