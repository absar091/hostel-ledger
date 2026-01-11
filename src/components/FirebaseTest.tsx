import React, { useEffect, useState } from 'react';
import { auth, database } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';

const FirebaseTest = () => {
  const [status, setStatus] = useState<{
    auth: string;
    database: string;
    error?: string;
  }>({
    auth: 'Checking...',
    database: 'Checking...'
  });

  useEffect(() => {
    const testFirebase = async () => {
      try {
        // Test Auth
        if (auth) {
          setStatus(prev => ({ ...prev, auth: '✅ Connected' }));
        } else {
          setStatus(prev => ({ ...prev, auth: '❌ Failed' }));
        }

        // Test Database
        if (database) {
          // Try to write and read a test value
          const testRef = ref(database, 'test');
          await set(testRef, { timestamp: Date.now() });
          const snapshot = await get(testRef);
          
          if (snapshot.exists()) {
            setStatus(prev => ({ ...prev, database: '✅ Connected & Working' }));
          } else {
            setStatus(prev => ({ ...prev, database: '⚠️ Connected but can\'t read/write' }));
          }
        } else {
          setStatus(prev => ({ ...prev, database: '❌ Failed' }));
        }
      } catch (error: any) {
        setStatus(prev => ({ 
          ...prev, 
          database: '❌ Error',
          error: error.message 
        }));
      }
    };

    testFirebase();
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-card p-4 rounded-lg shadow-lg border z-50 max-w-xs">
      <h3 className="font-semibold mb-2">🔥 Firebase Status</h3>
      <div className="space-y-1 text-sm">
        <div>Auth: {status.auth}</div>
        <div>Database: {status.database}</div>
        {status.error && (
          <div className="text-red-500 text-xs mt-2">
            Error: {status.error}
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Remove this component in production
      </div>
    </div>
  );
};

export default FirebaseTest;