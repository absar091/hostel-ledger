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
,
  MessageCircle,
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { useFileExport } from "@/hooks/useFileExport";
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useOneSignalPush } from '@/hooks/useOneSignalPush';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getCurrency, DEFAULT_CURRENCY } from '@/lib/currency';
import { getLanguage, DEFAULT_LANGUAGE } from '@/lib/languages';
import CurrencySelectionSheet from '@/components/CurrencySelectionSheet';
import LanguageSelectionSheet from '@/components/LanguageSelectionSheet';
import { Globe, DollarSign, Download ,
  MessageCircle,
  ShieldAlert
} from 'lucide-react';
import MobileHeader from '@/components/MobileHeader';

const Settings = () => {
    const { t, i18n } = useTranslation();
    const { user, updateUserProfile, logout } = useFirebaseAuth();
    const navigate = useNavigate();
    const { exportData } = useFileExport();
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
    const [isCurrencySheetOpen, setIsCurrencySheetOpen] = useState(false);
    const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState(false);
    const [isSupportSheetOpen, setIsSupportSheetOpen] = useState(false);
    const { currencyCode } = useCurrency();
    const currentCurrency = getCurrency(user?.currency || DEFAULT_CURRENCY);
    const currentLanguage = getLanguage(user?.language || DEFAULT_LANGUAGE);
    const [activeTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("profile");

    useEffect(() => {
        if (user?.language && user.language !== i18n.language) {
            i18n.changeLanguage(user.language);
        }
    }, [user?.language, i18n]);

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
            toast.success(value ? t('settings.email_enabled_toast') : t('settings.email_disabled_toast'));
        } catch (error) {
            console.error("Error updating preference:", error);
            toast.error(t('common.error_occurred'));
            setPreferences(prev => ({ ...prev, emailEnabled: !value }));
        }
    };

    const handleTogglePush = async (checked: boolean) => {
        try {
            if (checked) {
                const success = await subscribePush();
                if (success) toast.success(t('settings.push_enabled'));
            } else {
                await unsubscribePush();
                toast.success(t('settings.push_disabled'));
            }
        } catch (error) {
            console.error("Push toggle error:", error);
            toast.error(t('settings.push_error'));
        }
    };

    const handleLogout = async () => {
        if (confirm(t('settings.logout_confirm'))) {
            try {
                await logout();
                toast.success(t('settings.logout_success'));
                navigate("/login", { replace: true });
            } catch (error) {
                toast.error(t('settings.logout_failed'));
            }
        }
    };

    const handleClearCache = async () => {
        if (confirm(t('settings.clear_cache') + ' ' + t('settings.clear_cache_desc'))) {
            try {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                }
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map(reg => reg.unregister()));
                }
                toast.success(t('settings.cache_cleared'));
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                toast.error(t('common.error_occurred'));
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
                <MobileHeader title={t('settings.title')} showBackButton={true} />

                <main className="max-w-2xl mx-auto pt-6 sm:pt-10 px-4 pb-32">
                    {/* Simplified Preferences Section */}
                    <Section title={t('settings.preferences')}>
                        <SettingItem
                            icon={Smartphone}
                            label={t('settings.push_notifications')}
                            description={pushSupported ? (isPushSubscribed ? t('common.enabled') : t('settings.push_desc')) : t('settings.push_not_supported')}
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
                            label={t('settings.email_notifications')}
                            description={t('settings.email_desc')}
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
                            label={t('settings.show_balance')}
                            description={t('settings.balance_desc')}
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
                                                toast.success(t('settings.privacy_success', { status: checked ? t('common.enabled') : t('common.disabled') }));
                                            } else {
                                                toast.error(result.error || t('settings.privacy_error'));
                                            }
                                        } catch (error) {
                                            console.error("Privacy update error:", error);
                                            toast.error(t('common.error_occurred'));
                                        } finally {
                                            setUpdatingPrivacy(false);
                                        }
                                    }}
                                    disabled={updatingPrivacy}
                                />
                            }
                        />
                        <SettingItem
                            icon={DollarSign}
                            label={t('settings.currency')}
                            description={`${currentCurrency.name} (${currentCurrency.symbol})`}
                            iconBg="bg-blue-100"
                            iconColor="text-blue-600"
                            showChevron={true}
                            onClick={() => setIsCurrencySheetOpen(true)}
                        />
                        <SettingItem
                            icon={Globe}
                            label={t('settings.language')}
                            description={`${currentLanguage.name} (${currentLanguage.nativeName})`}
                            iconBg="bg-purple-100"
                            iconColor="text-purple-600"
                            showChevron={true}
                            onClick={() => setIsLanguageSheetOpen(true)}
                        />

                        {/* Language support info */}
                        <div className="bg-blue-50/50 p-4 border-t border-blue-100 flex gap-3">
                            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-blue-700 font-bold leading-relaxed italic">
                                "{t('settings.language_support_notice')}"
                            </p>
                        </div>
                    </Section>

                    <Section title="Data Management">
                        <SettingItem
                            icon={Download}
                            label="Export Data"
                            description="Save your groups and transactions to a file"
                            iconBg="bg-green-100"
                            iconColor="text-green-600"
                            onClick={exportData}
                            showChevron={true}
                        />
                    </Section>

                    <CurrencySelectionSheet
                        open={isCurrencySheetOpen}
                        onClose={() => setIsCurrencySheetOpen(false)}
                        selectedCurrency={user?.currency || DEFAULT_CURRENCY}
                        onSelect={async (code) => {
                            try {
                                const result = await updateUserProfile({ currency: code });
                                if (result.success) {
                                    toast.success(t('settings.currency_updated_toast', { code }));
                                } else {
                                    toast.error(result.error || t('common.error_occurred'));
                                }
                            } catch (error) {
                                console.error("Currency update error:", error);
                                toast.error(t('common.error_occurred'));
                            }
                        }}
                    />

                    <LanguageSelectionSheet
                        open={isLanguageSheetOpen}
                        onClose={() => setIsLanguageSheetOpen(false)}
                        selectedLanguage={user?.language || DEFAULT_LANGUAGE}
                        onSelect={async (code) => {
                            try {
                                const result = await updateUserProfile({ language: code });
                                if (result.success) {
                                    i18n.changeLanguage(code);
                                    toast.success(t('settings.language_updated_toast', { name: getLanguage(code).name }));
                                } else {
                                    toast.error(result.error || t('common.error_occurred'));
                                }
                            } catch (error) {
                                console.error("Language update error:", error);
                                toast.error(t('common.error_occurred'));
                            }
                        }}
                    />

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
