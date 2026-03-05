import React from 'react';
import { ShieldAlert, Wrench } from 'lucide-react';

export default function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full flex items-center justify-center mb-6">
        <Wrench className="w-12 h-12" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Under Maintenance</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md">
        We are currently performing scheduled maintenance to improve your experience.
        Please check back later. We apologize for the inconvenience!
      </p>

      <div className="mt-8 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <ShieldAlert className="w-4 h-4" />
        <span>System is locked by an administrator.</span>
      </div>
    </div>
  );
}
