import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, BellOff, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import AppContainer from "@/components/AppContainer";
import { useOneSignalPush } from "@/hooks/useOneSignalPush";
import { toast } from "sonner";

const Notifications = () => {
  const navigate = useNavigate();
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
  } = useOneSignalPush();

  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("profile");
  const [isToggling, setIsToggling] = useState(false);

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === "home") navigate("/");
    else if (tab === "groups") navigate("/groups");
    else if (tab === "activity") navigate("/activity");
    else if (tab === "profile") navigate("/profile");
  };

  const handleTogglePushNotifications = async () => {
    setIsToggling(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        const success = await subscribe();
        if (success) {
          // Show a test notification
          await showNotification("Notifications Enabled! 🎉", {
            body: "You'll now receive updates about your expenses and payments.",
            tag: "welcome",
          });
        }
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleTestNotification = async () => {
    if (permission !== "granted") {
      toast.error("Please enable notifications first");
      return;
    }

    await showNotification("Test Notification 🔔", {
      body: "This is a test notification from Hostel Ledger!",
      tag: "test",
      requireInteraction: false,
    });
    toast.success("Test notification sent!");
  };

  return (
    <>
      <Sidebar />
      
      <AppContainer className="bg-white pb-20">
        <DesktopHeader />
        
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>
        
        <div className="bg-white border-b border-[#4a6850]/10 pt-2 pb-3 px-4 sticky top-0 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/profile")}
              className="w-9 h-9 rounded-full bg-[#4a6850]/10 flex items-center justify-center hover:bg-[#4a6850]/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#4a6850]" />
            </button>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Notifications</h1>
          </div>
        </div>

        <main className="px-4 pt-6 space-y-6">
          {/* Status Card */}
          <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl p-6 border border-[#4a6850]/20">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isSubscribed ? 'bg-gradient-to-br from-[#4a6850] to-[#3d5643]' : 'bg-gray-200'
              }`}>
                {isSubscribed ? (
                  <Bell className="w-7 h-7 text-white" />
                ) : (
                  <BellOff className="w-7 h-7 text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-black text-gray-900">Push Notifications</h2>
                <p className="text-sm text-[#4a6850]/80 font-medium">
                  {isSubscribed ? "Enabled" : "Disabled"}
                </p>
              </div>
              {isSubscribed && (
                <div className="w-8 h-8 rounded-full bg-[#4a6850] flex items-center justify-center">
                  <Check className="w-5 h-5 text-white font-bold" />
                </div>
              )}
            </div>
          </div>

          {/* Browser Support Info */}
          {!isSupported && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <X className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-orange-900 text-sm">Not Supported</p>
                  <p className="text-xs text-orange-700 mt-1">
                    Push notifications are not supported on this device or browser.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Permission Status */}
          {isSupported && permission !== "granted" && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-blue-900 text-sm">Permission Required</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Enable notifications to receive updates about your expenses and payments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Toggle */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#4a6850]/80 uppercase tracking-widest px-2">Settings</h3>
            
            <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-black text-gray-900">Push Notifications</p>
                  <p className="text-sm text-[#4a6850]/80 font-medium mt-1">
                    Get notified about expenses and payments
                  </p>
                </div>
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handleTogglePushNotifications}
                  disabled={!isSupported || isLoading || isToggling}
                  className="data-[state=checked]:bg-[#4a6850]"
                />
              </div>
            </div>
          </div>

          {/* Notification Types */}
          {isSubscribed && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-[#4a6850]/80 uppercase tracking-widest px-2">Notification Types</h3>
              
              <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">New Expenses</p>
                    <p className="text-xs text-[#4a6850]/80 font-medium mt-0.5">
                      When someone adds an expense
                    </p>
                  </div>
                  <Switch checked disabled className="data-[state=checked]:bg-[#4a6850]" />
                </div>

                <div className="h-px bg-[#4a6850]/10"></div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">Payment Received</p>
                    <p className="text-xs text-[#4a6850]/80 font-medium mt-0.5">
                      When someone pays you back
                    </p>
                  </div>
                  <Switch checked disabled className="data-[state=checked]:bg-[#4a6850]" />
                </div>

                <div className="h-px bg-[#4a6850]/10"></div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">Payment Reminders</p>
                    <p className="text-xs text-[#4a6850]/80 font-medium mt-0.5">
                      Reminders for pending payments
                    </p>
                  </div>
                  <Switch checked disabled className="data-[state=checked]:bg-[#4a6850]" />
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center px-4">
                Individual notification preferences coming soon
              </p>
            </div>
          )}

          {/* Test Notification */}
          {isSubscribed && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-[#4a6850]/80 uppercase tracking-widest px-2">Test</h3>
              
              <Button
                onClick={handleTestNotification}
                className="w-full h-14 bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-bold rounded-2xl"
              >
                Send Test Notification
              </Button>
            </div>
          )}

          {/* Info */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong className="text-gray-900">Note:</strong> Notifications require your browser to stay signed in. 
              You can manage notification permissions in your browser settings.
            </p>
          </div>

          {/* Debug Info (Development Only) */}
          {import.meta.env.DEV && (
            <div className="bg-gray-900 rounded-2xl p-4 text-white text-xs font-mono space-y-2">
              <p><strong>Debug Info:</strong></p>
              <p>Supported: {isSupported ? "✓" : "✗"}</p>
              <p>Permission: {permission}</p>
              <p>Subscribed: {isSubscribed ? "✓" : "✗"}</p>
              <p>OneSignal App ID: {import.meta.env.VITE_ONESIGNAL_APP_ID ? "✓ Configured" : "✗ Missing"}</p>
            </div>
          )}
        </main>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </AppContainer>
    </>
  );
};

export default Notifications;
