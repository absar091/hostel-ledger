import React, { useState, useEffect } from 'react';
import { Megaphone, X } from 'lucide-react';
import { useFirebaseData } from '../contexts/FirebaseDataContext';

export default function BroadcastBanner() {
  const { globalBroadcast } = useFirebaseData();
  const [dismissed, setDismissed] = useState(false);

  // Re-show banner if a NEW broadcast comes in
  useEffect(() => {
    if (globalBroadcast) {
      const lastDismissedTime = localStorage.getItem(`broadcast_dismissed_${globalBroadcast.timestamp}`);
      if (!lastDismissedTime) {
        setDismissed(false);
      }
    }
  }, [globalBroadcast]);

  const handleDismiss = () => {
    if (globalBroadcast) {
      localStorage.setItem(`broadcast_dismissed_${globalBroadcast.timestamp}`, Date.now().toString());
    }
    setDismissed(true);
  };

  if (!globalBroadcast || dismissed || !globalBroadcast.title) {
    return null;
  }

  return (
    <div className="w-full bg-blue-600 text-white px-4 py-3 flex items-start sm:items-center justify-between shadow-md relative z-50">
      <div className="flex items-start sm:items-center gap-3 flex-1 pr-4">
        <div className="p-1.5 bg-blue-700 rounded-lg flex-shrink-0">
          <Megaphone className="w-5 h-5" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="font-bold text-sm sm:text-base whitespace-nowrap">{globalBroadcast.title}</span>
          <span className="hidden sm:inline-block text-blue-200">•</span>
          <span className="text-sm text-blue-100">{globalBroadcast.message}</span>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1.5 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Dismiss broadcast message"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
