import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

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
      const isSupported = 
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (isSupported) {
        const permission = Notification.permission;
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        setState({
          isSupported: true,
          isSubscribed: !!subscription,
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

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setState((prev) => ({ ...prev, isSubscribed: true }));
        return true;
      }

      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return false;
      }

      // Subscribe to push notifications
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        logger.error("VAPID public key not configured");
        toast.error("Push notifications not configured");
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      logger.info("Push notification subscription created", { 
        endpoint: subscription.endpoint 
      });

      setState((prev) => ({ ...prev, isSubscribed: true }));
      
      // Send subscription to backend
      try {
        // Get user from Firebase Auth context instead of localStorage
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        console.log('📤 Sending subscription to backend for user:', currentUser?.uid);
        
        if (currentUser?.uid) {
          const subscriptionData = {
            userId: currentUser.uid,
            subscription: subscription.toJSON()
          };
          
          console.log('📤 Subscription data:', subscriptionData);
          
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
            logger.info("Subscription sent to backend successfully");
            toast.success("✅ Subscribed successfully!");
          } else {
            logger.warn("Failed to send subscription to backend", { response: responseData });
            toast.warning("Subscribed locally, but backend sync failed");
          }
        } else {
          console.warn('⚠️ No user logged in');
          toast.warning("Please log in to enable notifications");
        }
      } catch (error: any) {
        console.error("❌ Failed to send subscription to backend:", error);
        logger.error("Failed to send subscription to backend", { error: error.message });
        toast.warning("Subscribed locally, but backend sync failed");
      }

      return true;
    } catch (error: any) {
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
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        logger.info("Push notification subscription removed");
        setState((prev) => ({ ...prev, isSubscribed: false }));
        toast.success("Push notifications disabled");
        return true;
      }

      return false;
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
