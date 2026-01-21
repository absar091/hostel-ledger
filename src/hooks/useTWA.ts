import { useState, useEffect } from 'react';

/**
 * Hook to detect if the app is running in TWA (Trusted Web Activity) mode
 * This allows you to show different content in the Android app vs the website
 * 
 * @returns {boolean} true if running in TWA mode, false otherwise
 * 
 * @example
 * const isTWA = useTWA();
 * 
 * return (
 *   <div>
 *     {isTWA ? (
 *       <p>You're using the Android app!</p>
 *     ) : (
 *       <p>You're on the website</p>
 *     )}
 *   </div>
 * );
 */
export const useTWA = (): boolean => {
  const [isTWA, setIsTWA] = useState<boolean>(() => {
    // Check localStorage on initial load
    return localStorage.getItem('isTWA') === 'true';
  });

  useEffect(() => {
    // Check for twa query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const twaParam = urlParams.get('twa');

    if (twaParam === 'true') {
      // Save to localStorage so it persists across navigation
      localStorage.setItem('isTWA', 'true');
      setIsTWA(true);
      
      // Optional: Remove the query parameter from URL for cleaner URLs
      const url = new URL(window.location.href);
      url.searchParams.delete('twa');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return isTWA;
};

/**
 * Hook to get TWA-specific information
 * Provides more detailed information about the TWA environment
 */
export const useTWAInfo = () => {
  const isTWA = useTWA();
  
  return {
    isTWA,
    isWebsite: !isTWA,
    platform: isTWA ? 'android-app' : 'web',
  };
};
