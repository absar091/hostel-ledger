import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import OneSignal from "react-onesignal";

export interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
}

let oneSignalInitialized = false;

export const useOneSignalPush = () => {
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
          // Wait a bit for PWA service worker to register first
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await OneSignal.init({
            appId: appId,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: 'OneSignalSDK.sw.js',
          });
          oneSignalInitialized = true;
          console.log('✅ OneSignal initialized');
        }

        const permission = OneSignal.Notifications.permission;
        const isSubscribed = OneSignal.User.PushSubscription.optedIn;

        setState({
          isSupported: true,
          isSubscribed: isSubscribed,
          permission: permission ? "granted" : "default",
          isLoading: false,
        });

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', (subscription) => {
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
      
      setState((prev) => ({ 
        ...prev, 
        permission: permission ? "granted" : "denied" 
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
        await OneSignal.login(currentUser.uid);
        console.log('✅ OneSignal user ID set:', currentUser.uid);
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

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
  };
};
