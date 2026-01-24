import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Monitor, Chrome, Apple } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import AppContainer from '@/components/AppContainer';

const InstallGuide = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      navigate('/');
    }
  };

  return (
    <AppContainer>
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-[#4a6850]/5 pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white p-6 pb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          
          <h1 className="text-3xl font-black mb-2">Install Hostel Ledger</h1>
          <p className="text-white/90 font-medium">
            Get the full app experience on your device
          </p>
        </div>

        <div className="px-4 -mt-4">
          {/* Status Card */}
          {isInstalled ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-green-900">App Installed!</h3>
                  <p className="text-sm text-green-700">You're using the installed version</p>
                </div>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900">Ready to Install</h3>
                  <p className="text-sm text-blue-700">Install now with one click</p>
                </div>
              </div>
              <button
                onClick={handleInstall}
                className="w-full h-12 bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Install App Now
              </button>
            </div>
          ) : null}

          {/* Platform Tabs */}
          <div className="bg-white rounded-2xl shadow-md p-2 mb-6 flex gap-2">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 h-12 rounded-xl font-bold transition-all ${
                activeTab === 'android'
                  ? 'bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Chrome className="w-5 h-5" />
                <span>Android</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 h-12 rounded-xl font-bold transition-all ${
                activeTab === 'ios'
                  ? 'bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Apple className="w-5 h-5" />
                <span>iOS</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('desktop')}
              className={`flex-1 h-12 rounded-xl font-bold transition-all ${
                activeTab === 'desktop'
                  ? 'bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Monitor className="w-5 h-5" />
                <span>Desktop</span>
              </div>
            </button>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            {activeTab === 'android' && (
              <>
                <h2 className="text-xl font-black text-gray-900">Android Chrome</h2>
                
                <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#4a6850] text-white flex items-center justify-center font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Open Chrome Browser</h3>
                      <p className="text-sm text-gray-600">Visit app.hostelledger.aarx.online in Chrome</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#4a6850] text-white flex items-center justify-center font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Tap Menu (⋮)</h3>
                      <p className="text-sm text-gray-600">Tap the three dots in the top-right corner</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#4a6850] text-white flex items-center justify-center font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Select "Install app"</h3>
                      <p className="text-sm text-gray-600">Or look for "Add to Home screen" option</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#4a6850] text-white flex items-center justify-center font-bold flex-shrink-0">
                      4
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Confirm Installation</h3>
                      <p className="text-sm text-gray-600">Tap "Install" in the popup dialog</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-bold text-green-900 mb-1">Done!</h3>
                      <p className="text-sm text-green-700">App icon will appear on your home screen</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'ios' && (
              <>
                <h2 className="text-xl font-black text-gray-900">iOS Safari</h2>
                
                <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#4a6850] text-white flex items-center justify-center font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Open Safari Browser</h3>
                      <p className="text-sm text-gray-600">Visit app.hostelledger.aarx.online in Safari</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#4a6850] text-white flex items-center justify-center font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Tap Share Button</h3>
                      <p className="text-sm text-gray-600">Tap the share icon (square with arrow) at the bottom</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#4a6850] text-white flex items-center justify-center font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Scroll and Find</h3>
                      <p className="text-sm text-gray-600">Scroll down and tap "Add to Home Screen"</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#4a6850] text-white flex items-center justify-center font-bold flex-shrink-0">
                      4
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Confirm Name</h3>
                      <p className="text-sm text-gray-600">Edit the name if needed, then tap "Add"</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-bold text-green-900 mb-1">Done!</h3>
                      <p className="text-sm text-green-700">App icon will appear on your home screen</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                  <p className="text-sm text-blue-900 font-medium">
                    <strong>Note:</strong> iOS only supports PWA installation through Safari browser. Chrome and other browsers won't show the install option.
                  </p>
                </div>
              </>
            )}

            {activeTab === 'desktop' && (
              <>
                <h2 className="text-xl font-black text-gray-900">Desktop Chrome</h2>
                
                <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#4a6850] text-white flex items-center justify-center font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Open Chrome Browser</h3>
                      <p className="text-sm text-gray-600">Visit app.hostelledger.aarx.online in Chrome</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#4a6850] text-white flex items-center justify-center font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Look for Install Icon</h3>
                      <p className="text-sm text-gray-600">Click the install icon (⊕) in the address bar</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#4a6850] text-white flex items-center justify-center font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Click "Install"</h3>
                      <p className="text-sm text-gray-600">Confirm installation in the popup dialog</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-bold text-green-900 mb-1">Done!</h3>
                      <p className="text-sm text-green-700">App will open in a new window and appear in your apps</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Benefits */}
            <div className="bg-gradient-to-br from-[#4a6850]/10 to-[#3d5643]/10 rounded-2xl p-6 mt-6">
              <h3 className="font-black text-gray-900 mb-4">Why Install?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Works Offline</p>
                    <p className="text-sm text-gray-600">Access your data even without internet</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Faster Loading</p>
                    <p className="text-sm text-gray-600">Instant access from your home screen</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Push Notifications</p>
                    <p className="text-sm text-gray-600">Get notified about new expenses</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Native Experience</p>
                    <p className="text-sm text-gray-600">Feels like a real app, not a website</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppContainer>
  );
};

export default InstallGuide;
