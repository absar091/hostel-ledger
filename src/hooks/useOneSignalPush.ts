import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import OneSignal from "react-onesignal";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

export interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
}

let oneSignalInitialized = false;

export const useOneSignalPush = () => {
  const { user } = useFirebaseAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: "default",
    isLoading: true,
  });

  // Initialize OneSignal
  useEffect(() => {
    const initOneSignal = async () => {
      try {
        const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;

        if (!appId) {
          console.warn('⚠️ OneSignal App ID not configured');
          setState({
            isSupported: false,
            isSubscribed: false,
            permission: "denied",
            isLoading: false,
          });
          return;
        }

        if (!oneSignalInitialized) {
          // Wait for PWA service worker to register first
          await new Promise(resolve => setTimeout(resolve, 1000));


          try {
            await OneSignal.init({
              appId: appId,
              safari_web_id: 'web.onesignal.auto.521cdcf4-43b8-4659-a2e2-fd037f95e0d5',
              allowLocalhostAsSecureOrigin: true,
              serviceWorkerPath: 'OneSignalSDKWorker.js',
              autoResubscribe: true,
            });
            oneSignalInitialized = true;
            console.log('✅ OneSignal initialized');
          } catch (initError: any) {
            // Check if error is "SDK already initialized"
            if (initError?.message?.includes('SDK already initialized') || initError?.includes?.('SDK already initialized')) {
              console.log('✅ OneSignal already initialized (recovered from error)');
              oneSignalInitialized = true;
            } else {
              throw initError;
            }
          }
        }

        // Check subscription status
        const permission = OneSignal.Notifications.permission;
        const isSubscribed = OneSignal.User.PushSubscription.optedIn;

        // Get actual browser permission state
        const browserPermission = typeof Notification !== 'undefined'
          ? Notification.permission
          : 'default';

        console.log('📊 OneSignal status:', { permission, isSubscribed, browserPermission });

        setState({
          isSupported: true,
          isSubscribed: isSubscribed,
          permission: browserPermission,
          isLoading: false,
        });

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', (subscription) => {
          console.log('🔄 Subscription changed:', subscription);
          setState(prev => ({
            ...prev,
            isSubscribed: subscription.current.optedIn,
          }));
        });

      } catch (error: any) {
        console.error('❌ OneSignal initialization error:', error);
        logger.error("OneSignal initialization failed", { error: error.message });
        setState({
          isSupported: false,
          isSubscribed: false,
          permission: "denied",
          isLoading: false,
        });
      }
    };

    initOneSignal();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      toast.error("Push notifications are not supported on this device");
      return false;
    }

    try {
      const permission = await OneSignal.Notifications.requestPermission();

      // Get actual browser permission
      const browserPermission = typeof Notification !== 'undefined'
        ? Notification.permission
        : 'default';

      setState((prev) => ({
        ...prev,
        permission: browserPermission
      }));

      if (permission) {
        toast.success("Notifications enabled! 🔔");
        logger.info("Notification permission granted");
        return true;
      } else {
        toast.error("Notification permission denied");
        logger.warn("Notification permission denied");
        return false;
      }
    } catch (error: any) {
      logger.error("Failed to request notification permission", { error: error.message });
      toast.error("Failed to enable notifications");
      return false;
    }
  }, [state.isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      toast.error("Push notifications are not supported on this device");
      return false;
    }

    try {
      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return false;
      }

      // Set external user ID (your user ID from Firebase)
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser?.uid) {
        console.log('🔑 Setting OneSignal External ID:', currentUser.uid);
        await OneSignal.login(currentUser.uid);
        console.log('✅ OneSignal user ID set:', currentUser.uid);

        // CRITICAL: Explicitly opt-in to receive push notifications
        console.log('📲 Opting in to push notifications...');
        await OneSignal.User.PushSubscription.optIn();
        console.log('✅ Opted in to push notifications');

        // Get OneSignal Player ID (after opt-in)
        const playerId = await OneSignal.User.PushSubscription.id;
        console.log('🎯 OneSignal Player ID:', playerId);

        // Store Player ID in Firebase Realtime Database
        if (playerId) {
          try {
            const { getDatabase, ref, set } = await import('firebase/database');
            const db = getDatabase();
            await set(ref(db, `oneSignalPlayers/${currentUser.uid}`), {
              playerId: playerId,
              updatedAt: new Date().toISOString(),
              userAgent: navigator.userAgent,
            });
            console.log('✅ Player ID stored in Firebase');

            // Store in localStorage as backup
            localStorage.setItem('oneSignalPlayerId', playerId);
            localStorage.setItem('oneSignalUserId', currentUser.uid);
          } catch (error) {
            console.error('❌ Failed to store Player ID:', error);
          }
        }

        // Verify External ID was set
        const externalId = OneSignal.User.externalId;
        console.log('🔍 Verified External ID:', externalId);
      } else {
        console.warn('⚠️ No Firebase user found, cannot set External ID');
      }

      setState((prev) => ({ ...prev, isSubscribed: true }));
      toast.success("✅ Push notifications enabled!");
      logger.info("Push notifications enabled successfully");

      return true;
    } catch (error: any) {
      console.error("❌ Failed to subscribe to push notifications:", error);
      logger.error("Failed to subscribe to push notifications", { error: error.message });
      toast.error("Failed to enable push notifications");
      return false;
    }
  }, [state.isSupported, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      return false;
    }

    try {
      await OneSignal.User.PushSubscription.optOut();

      setState((prev) => ({ ...prev, isSubscribed: false }));
      toast.success("Push notifications disabled");
      logger.info("Push notifications disabled");

      return true;
    } catch (error: any) {
      logger.error("Failed to unsubscribe from push notifications", { error: error.message });
      toast.error("Failed to disable push notifications");
      return false;
    }
  }, [state.isSupported]);

  // Show a local notification (for testing)
  const showNotification = useCallback(async (
    title: string,
    _options?: NotificationOptions
  ): Promise<void> => {
    if (!state.isSupported) {
      return;
    }

    if (state.permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      // OneSignal handles notifications automatically
      console.log('Notification will be shown by OneSignal:', title);
    } catch (error: any) {
      logger.error("Failed to show notification", { error: error.message });
    }
  }, [state.isSupported, state.permission, requestPermission]);

  // Sync OneSignal login state with Firebase Auth
  useEffect(() => {
    if (!state.isSupported || state.isLoading) return;

    const syncAuth = async () => {
      try {
        if (user) {
          // User is logged in, ensure OneSignal is logged in
          // Check if OneSignal.User is available to avoid "reading 'tt'" undefined error
          if (!OneSignal.User) {
            console.warn('⚠️ OneSignal.User is not available yet, skipping auth sync');
            return;
          }

          const currentExternalId = OneSignal.User.externalId;
          if (currentExternalId !== user.uid) {
            console.log('🔗 Syncing OneSignal User:', user.uid);
            await OneSignal.login(user.uid);
          }
        } else {
          // User is logged out, ensure OneSignal is logged out
          if (OneSignal.User && OneSignal.User.externalId) {
            console.log('🔓 Logging out from OneSignal');
            await OneSignal.logout();
          }
        }
      } catch (error) {
        console.error('OneSignal auth sync failed:', error);
      }
    };

    syncAuth();
  }, [state.isSupported, state.isLoading, user]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
  };
};
