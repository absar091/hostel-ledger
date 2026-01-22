import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { getMessagingInstance } from "@/lib/firebase";
import { getToken, deleteToken, isSupported as isMessagingSupported } from "firebase/messaging";

export interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: "default",
    isLoading: true,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const isSupported = await isMessagingSupported();
        
        if (isSupported) {
          const permission = Notification.permission;
          const messaging = await getMessagingInstance();
          
          // Check if we have an FCM token stored
          const hasToken = !!messaging;

          setState({
            isSupported: true,
            isSubscribed: hasToken && permission === "granted",
            permission,
            isLoading: false,
          });
        } else {
          setState({
            isSupported: false,
            isSubscribed: false,
            permission: "denied",
            isLoading: false,
          });
        }
      } catch (error) {
        console.error("Error checking push notification support:", error);
        setState({
          isSupported: false,
          isSubscribed: false,
          permission: "denied",
          isLoading: false,
        });
      }
    };

    checkSupport();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      toast.error("Push notifications are not supported on this device");
      return false;
    }

    if (state.permission === "granted") {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));

      if (permission === "granted") {
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
  }, [state.isSupported, state.permission]);

  // Subscribe to push notifications using Firebase Messaging SDK
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

      // Get Firebase Messaging instance
      const messaging = await getMessagingInstance();
      if (!messaging) {
        logger.error("Firebase Messaging not initialized");
        toast.error("Push notifications not available");
        return false;
      }

      // Get VAPID public key
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        logger.error("VAPID public key not configured");
        toast.error("Push notifications not configured");
        return false;
      }

      // Get FCM token using Firebase Messaging SDK
      console.log('🔔 Requesting FCM token...');
      const fcmToken = await getToken(messaging, {
        vapidKey: vapidPublicKey,
      });

      if (!fcmToken) {
        logger.error("Failed to get FCM token");
        toast.error("Failed to enable push notifications");
        return false;
      }

      console.log('✅ FCM token obtained:', fcmToken.substring(0, 20) + '...');
      logger.info("FCM token obtained successfully");

      setState((prev) => ({ ...prev, isSubscribed: true }));
      
      // Send FCM token to backend
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        console.log('📤 Sending FCM token to backend for user:', currentUser?.uid);
        
        if (currentUser?.uid) {
          const subscriptionData = {
            userId: currentUser.uid,
            fcmToken: fcmToken
          };
          
          console.log('📤 Subscription data:', { userId: currentUser.uid, tokenLength: fcmToken.length });
          
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/push-subscribe`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(subscriptionData)
          });

          console.log('📥 Backend response status:', response.status);
          const responseData = await response.json();
          console.log('📥 Backend response data:', responseData);

          if (response.ok) {
            logger.info("FCM token sent to backend successfully");
            toast.success("✅ Push notifications enabled!");
          } else {
            logger.warn("Failed to send FCM token to backend", { response: responseData });
            toast.warning("Subscribed locally, but backend sync failed");
          }
        } else {
          console.warn('⚠️ No user logged in');
          toast.warning("Please log in to enable notifications");
        }
      } catch (error: any) {
        console.error("❌ Failed to send FCM token to backend:", error);
        logger.error("Failed to send FCM token to backend", { error: error.message });
        toast.warning("Subscribed locally, but backend sync failed");
      }

      return true;
    } catch (error: any) {
      console.error("❌ Failed to subscribe to push notifications:", error);
      logger.error("Failed to subscribe to push notifications", { error: error.message });
      toast.error("Failed to enable push notifications");
      return false;
    }
  }, [state.isSupported, requestPermission]);

  // Unsubscribe from push notifications using Firebase Messaging SDK
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      return false;
    }

    try {
      const messaging = await getMessagingInstance();
      if (!messaging) {
        logger.warn("Firebase Messaging not initialized");
        return false;
      }

      // Delete FCM token
      await deleteToken(messaging);
      logger.info("FCM token deleted");
      
      // Remove from backend
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (currentUser?.uid) {
          await fetch(`${import.meta.env.VITE_API_URL}/api/push-unsubscribe/${currentUser.uid}`, {
            method: 'DELETE',
            headers: { 
              'Cache-Control': 'no-cache'
            }
          });
        }
      } catch (error) {
        console.warn("Failed to remove subscription from backend:", error);
      }

      setState((prev) => ({ ...prev, isSubscribed: false }));
      toast.success("Push notifications disabled");
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
    options?: NotificationOptions
  ): Promise<void> => {
    if (!state.isSupported) {
      return;
    }

    if (state.permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: "/only-logo.png",
        badge: "/only-logo.png",
        ...options,
      });
    } catch (error: any) {
      logger.error("Failed to show notification", { error: error.message });
    }
  }, [state.isSupported, state.permission, requestPermission]);

  // Register periodic background sync (if supported)
  const registerPeriodicSync = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if periodic sync is supported
      if ("periodicSync" in registration) {
        const status = await (navigator as any).permissions.query({
          name: "periodic-background-sync",
        });

        if (status.state === "granted") {
          await (registration as any).periodicSync.register("check-expenses", {
            minInterval: 24 * 60 * 60 * 1000, // 24 hours
          });
          logger.info("Periodic background sync registered");
          return true;
        }
      }
      
      logger.warn("Periodic background sync not supported");
      return false;
    } catch (error: any) {
      logger.error("Failed to register periodic sync", { error: error.message });
      return false;
    }
  }, [state.isSupported]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    registerPeriodicSync,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
