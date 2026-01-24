import { useEffect, useState } from "react";
import { getCacheStatus } from "@/lib/offlineDB";

interface OfflineScreenProps {
  onRetry?: () => void;
}

export const OfflineScreen = ({ onRetry }: OfflineScreenProps) => {
  const [cacheStatus, setCacheStatus] = useState({
    hasGroups: false,
    hasTransactions: false,
    hasUser: false,
    groupCount: 0,
    transactionCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    const checkCache = async () => {
      try {
        // Check if service worker is installed (first-time detection)
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          setIsFirstTime(!registration);
        } else {
          setIsFirstTime(true);
        }

        const status = await getCacheStatus();
        setCacheStatus(status);
        
        // Log cache status for debugging
        console.log('📊 Cache Status:', status);
      } catch (error) {
        console.error('Failed to check cache status:', error);
        setIsFirstTime(true); // Assume first time on error
      } finally {
        setIsLoading(false);
      }
    };

    checkCache();
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-orange-50/30 px-6">
      {/* Top accent border */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 z-50"></div>
      
      <div className="flex flex-col items-center max-w-md w-full">
        {/* Offline Icon with Animation */}
        <div className="relative mb-8">
          {/* Pulse animation */}
          <div className="absolute inset-0 w-28 h-28 bg-orange-400/20 rounded-full animate-ping"></div>
          
          {/* Icon container */}
          <div className="relative w-28 h-28 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-[0_20px_60px_rgba(249,115,22,0.3)] border-2 border-orange-400/30">
            {/* Inner highlight */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
            
            {/* Offline icon */}
            <svg className="relative w-14 h-14 text-white z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-3xl font-black text-gray-900 mb-3 text-center">
          {!isLoading && isFirstTime ? "Internet Required" : !isLoading && !cacheStatus.hasUser ? "First-Time Setup" : "You're Offline"}
        </h1>
        
        {/* Loading or Status Message */}
        {isLoading ? (
          <div className="flex items-center gap-2 mb-8">
            <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-base text-gray-600 font-medium">Checking...</p>
          </div>
        ) : isFirstTime ? (
          <div className="mb-8 text-center">
            <p className="text-base text-gray-700 font-medium mb-3 leading-relaxed">
              <span className="font-bold text-gray-900">This is your first time opening Hostel Ledger.</span>
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Please connect to the internet to download the app.<br />
              After that, you can use it offline anytime! 🚀
            </p>
          </div>
        ) : (
          <>
            {cacheStatus.hasUser && (cacheStatus.hasGroups || cacheStatus.hasTransactions) ? (
              <div className="mb-8 text-center">
                <p className="text-base text-gray-700 font-medium mb-2">
                  Loading your cached data...
                </p>
                <p className="text-sm text-gray-500">
                  {cacheStatus.groupCount} group{cacheStatus.groupCount !== 1 ? 's' : ''} • {cacheStatus.transactionCount} transaction{cacheStatus.transactionCount !== 1 ? 's' : ''}
                </p>
              </div>
            ) : !cacheStatus.hasUser ? (
              <p className="text-base text-gray-600 mb-8 text-center leading-relaxed">
                <span className="font-semibold text-gray-800">First-time setup requires internet.</span><br />
                Please connect once, then you can use the app offline anytime.
              </p>
            ) : (
              <p className="text-base text-gray-600 mb-8 text-center">
                No internet connection detected.<br />
                Please check your connection and try again.
              </p>
            )}
          </>
        )}
        
        {/* Info Cards */}
        <div className="w-full space-y-3 mb-8">
          {/* Cached Data Status */}
          {!isLoading && cacheStatus.hasUser && (
            <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">Cached Data Available</h3>
                  <p className="text-sm text-gray-600">
                    Your data is cached and will load shortly. Changes will sync when you're back online.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* No Cache Warning */}
          {!isLoading && (isFirstTime || !cacheStatus.hasUser) && (
            <div className="bg-white rounded-2xl p-4 shadow-md border border-orange-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">
                    {isFirstTime ? "Service Worker Not Installed" : "No Cached Data"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isFirstTime 
                      ? "The app needs to download essential files. This only happens once and requires an internet connection."
                      : "You need to connect to the internet at least once to use the app offline."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Retry Info */}
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Auto-Sync Enabled</h3>
                <p className="text-sm text-gray-600">
                  The app will automatically sync your data when you reconnect to the internet.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Retry Button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
          >
            Try Again
          </button>
        )}
        
        {/* Auto-loading indicator */}
        {!isLoading && cacheStatus.hasUser && (cacheStatus.hasGroups || cacheStatus.hasTransactions) && (
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            <span>Loading app with cached data...</span>
          </div>
        )}
      </div>
    </div>
  );
};
