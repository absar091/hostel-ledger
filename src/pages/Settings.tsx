import { useState, useEffect } from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Sidebar from '@/components/Sidebar';
import DesktopHeader from '@/components/DesktopHeader';
import AppContainer from '@/components/AppContainer';
import BottomNav from '@/components/BottomNav';
import {
    Bell,
    Mail,
    Smartphone,
    ArrowLeft,
    Shield,
    Eye,
    ChevronRight,
    Lock,
    User,
    Info,
    MessageCircle,
    Check,
    LogOut,
    Share2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useOneSignalPush } from '@/hooks/useOneSignalPush';
import { cn } from '@/lib/utils';

const Settings = () => {
    const { user, updateUserProfile, logout } = useFirebaseAuth();
    const navigate = useNavigate();
    const {
        isSupported: pushSupported,
        isSubscribed: isPushSubscribed,
        isLoading: isPushLoading,
        subscribe: subscribePush,
        unsubscribe: unsubscribePush,
    } = useOneSignalPush();

    const [loading, setLoading] = useState(true);
    const [updatingPrivacy, setUpdatingPrivacy] = useState(false);
    const [preferences, setPreferences] = useState({
        emailEnabled: true,
    });
    const [activeTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("profile");

    useEffect(() => {
        const fetchPreferences = async () => {
            if (!user) return;
            try {
                const prefRef = doc(db, `users/${user.uid}/preferences/notifications`);
                const snap = await getDoc(prefRef);

                if (snap.exists()) {
                    setPreferences(snap.data() as any);
                } else {
                    await setDoc(prefRef, { emailEnabled: true }, { merge: true });
                }
            } catch (error) {
                console.error("Error fetching preferences:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPreferences();
    }, [user]);

    const updateEmailPreference = async (value: boolean) => {
        if (!user) return;
        setPreferences(prev => ({ ...prev, emailEnabled: value }));
        try {
            const prefRef = doc(db, `users/${user.uid}/preferences/notifications`);
            await setDoc(prefRef, { emailEnabled: value }, { merge: true });
            toast.success(`Email notifications ${value ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error("Error updating preference:", error);
            toast.error("Failed to update preference");
            setPreferences(prev => ({ ...prev, emailEnabled: !value }));
        }
    };

    const handleTogglePush = async (checked: boolean) => {
        try {
            if (checked) {
                const success = await subscribePush();
                if (success) toast.success("Push notifications enabled!");
            } else {
                await unsubscribePush();
                toast.success("Push notifications disabled");
            }
        } catch (error) {
            console.error("Push toggle error:", error);
            toast.error("Failed to update push settings");
        }
    };

    const handleLogout = async () => {
        if (confirm("Are you sure you want to log out?")) {
            try {
                await logout();
                toast.success("Logged out successfully");
                navigate("/login", { replace: true });
            } catch (error) {
                toast.error("Failed to logout");
            }
        }
    };

    const handleClearCache = async () => {
        if (confirm('Clear app cache? This will refresh the app with the latest version.')) {
            try {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                }
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map(reg => reg.unregister()));
                }
                toast.success("Cache cleared! Reloading app...");
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                toast.error("Failed to clear cache");
            }
        }
    };

    const SettingItem = ({
        icon: Icon,
        label,
        description,
        action,
        iconBg = "bg-gray-100",
        iconColor = "text-gray-600",
        showChevron = false,
        onClick,
        danger = false
    }: any) => (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center justify-between p-5 bg-white active:bg-[#4a6850]/5 transition-colors cursor-pointer",
                onClick ? "" : "cursor-default"
            )}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm", iconBg)}>
                    <Icon className={cn("w-5 h-5", iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={cn("text-[15px] font-black tracking-tight", danger ? "text-red-500" : "text-gray-900")}>{label}</p>
                    {description && <p className="text-[12px] text-[#4a6850]/70 font-bold mt-0.5 truncate">{description}</p>}
                </div>
            </div>
            {action ? (
                <div className="flex-shrink-0 ml-4 scale-110">
                    {action}
                </div>
            ) : showChevron && <ChevronRight className="w-5 h-5 text-[#4a6850]/30" />}
        </div>
    );

    const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <div className="mb-8 last:mb-12">
            <h3 className="px-5 mb-3 text-[12px] font-black text-[#4a6850]/70 uppercase tracking-[0.2em]">{title}</h3>
            <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/5 divide-y divide-[#4a6850]/5 overflow-hidden">
                {children}
            </div>
        </div>
    );

    return (
        <>
            <Sidebar />

            <AppContainer className="bg-[#FBFCFB] pb-32">
                <DesktopHeader />

                {/* Theme Consistent Large Title Header - Mobile only */}
                <div className="lg:hidden bg-white/50 backdrop-blur-xl border-b border-[#4a6850]/5 pt-12 pb-4 px-5 sticky top-0 z-40">
                    <div className="flex items-center justify-between mb-1">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-[#4a6850] font-bold flex items-center gap-1 active:opacity-60 transition-opacity"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
                </div>

                <main className="max-w-2xl mx-auto pt-6 sm:pt-10 px-4 pb-32">
                    {/* Simplified Preferences Section */}
                    <Section title="Preferences">
                        <SettingItem
                            icon={Smartphone}
                            label="Push Notifications"
                            description={pushSupported ? (isPushSubscribed ? "Enabled" : "Receive instant alerts") : "Not supported"}
                            iconBg="bg-[#4a6850]/10"
                            iconColor="text-[#4a6850]"
                            action={
                                <Switch
                                    checked={isPushSubscribed}
                                    onCheckedChange={handleTogglePush}
                                    disabled={!pushSupported || isPushLoading}
                                />
                            }
                        />
                        <SettingItem
                            icon={Mail}
                            label="Email Notifications"
                            description="Daily summaries and alerts"
                            iconBg="bg-[#4a6850]/10"
                            iconColor="text-[#4a6850]"
                            action={
                                <Switch
                                    checked={preferences.emailEnabled}
                                    onCheckedChange={updateEmailPreference}
                                    disabled={loading}
                                />
                            }
                        />
                        <SettingItem
                            icon={Eye}
                            label="Show Wallet Balance"
                            description="Visible to group members"
                            iconBg="bg-[#4a6850]/10"
                            iconColor="text-[#4a6850]"
                            action={
                                <Switch
                                    checked={user?.showBalanceToOthers ?? false}
                                    onCheckedChange={async (checked) => {
                                        setUpdatingPrivacy(true);
                                        try {
                                            const result = await updateUserProfile({ showBalanceToOthers: checked });
                                            if (result.success) {
                                                toast.success(`Balance visibility ${checked ? 'enabled' : 'disabled'}`);
                                            } else {
                                                toast.error(result.error || "Failed to update visibility");
                                            }
                                        } catch (error) {
                                            console.error("Privacy update error:", error);
                                            toast.error("An error occurred");
                                        } finally {
                                            setUpdatingPrivacy(false);
                                        }
                                    }}
                                    disabled={updatingPrivacy}
                                />
                            }
                        />
                    </Section>

                    {/* Footer Info */}
                    <div className="mt-8 mb-12 text-center px-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-[#4a6850] rounded-lg flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-[13px] font-black text-gray-900 tracking-tight">Hostel Ledger</span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                            v{__APP_VERSION__} • Build {__BUILD_DATE__}
                        </p>
                    </div>
                </main>

                <BottomNav activeTab={activeTab} onTabChange={(tab) => {
                    if (tab === "home") navigate("/");
                    else if (tab === "groups") navigate("/groups");
                    else if (tab === "activity") navigate("/activity");
                    else if (tab === "profile") navigate("/profile");
                }} />
            </AppContainer>
        </>
    );
};

export default Settings;
