import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('✅ Service Worker registered');
      
      // Check for updates every hour
      setInterval(() => {
        registration?.update();
      }, 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error('❌ Service Worker registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowUpdate(true);
      console.log('🔄 New version available');
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    await updateServiceWorker(true);
    setShowUpdate(false);
    setNeedRefresh(false);
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    setNeedRefresh(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white rounded-2xl shadow-2xl p-4 border border-white/10">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <h3 className="font-bold text-base mb-1">Update Available</h3>
            <p className="text-sm text-white/90 mb-3">
              A new version of Hostel Ledger is ready. Update now for the latest features and improvements.
            </p>
            
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="flex-1 h-9 bg-white text-[#4a6850] font-bold rounded-lg hover:bg-white/90 transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 h-9 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
