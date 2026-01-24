import { useState, useEffect } from 'react';
import { useOffline } from '@/hooks/useOffline';

export const OfflineIndicator = () => {
  const { offline, pendingCount, isSyncing, syncNow } = useOffline();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Show indicator when offline or has pending changes
    if (offline || pendingCount > 0) {
      setIsVisible(true);
      setIsDismissed(false);
    } else {
      // Hide after 2 seconds when back online and synced
      const timer = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [offline, pendingCount]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
      <div className={`
        rounded-full shadow-lg px-4 py-2 flex items-center gap-2 border
        ${offline 
          ? 'bg-orange-500 text-white border-orange-600' 
          : isSyncing 
            ? 'bg-blue-500 text-white border-blue-600'
            : 'bg-green-500 text-white border-green-600'
        }
      `}>
        {/* Status Icon */}
        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
        
        {/* Status Text */}
        <span className="text-sm font-medium">
          {offline ? (
            <>Offline{pendingCount > 0 && ` • ${pendingCount} pending`}</>
          ) : isSyncing ? (
            'Syncing...'
          ) : (
            'All synced'
          )}
        </span>

        {/* Sync Button (when offline with pending) */}
        {offline && pendingCount > 0 && (
          <button
            onClick={syncNow}
            className="ml-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full transition-colors"
          >
            Retry
          </button>
        )}

        {/* Dismiss Button */}
        {!offline && !isSyncing && (
          <button
            onClick={handleDismiss}
            className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
