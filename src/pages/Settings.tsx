import { useState, useEffect } from 'react';
import { useFirebaseData } from '@/contexts/FirebaseDataContext';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Sidebar } from '@/components/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Bell, Mail, Smartphone, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const Settings = () => {
    const { user } = useFirebaseAuth();
    const { isDesktop } = useSidebar();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState({
        emailEnabled: true,
        pushEnabled: true
    });

    useEffect(() => {
        const fetchPreferences = async () => {
            if (!user) return;
            try {
                const prefRef = doc(db, `users/${user.uid}/preferences/notifications`);
                const snap = await getDoc(prefRef);

                if (snap.exists()) {
                    setPreferences(snap.data() as any);
                } else {
                    // Defaults
                    await setDoc(prefRef, { emailEnabled: true, pushEnabled: true });
                }
            } catch (error) {
                console.error("Error fetching preferences:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPreferences();
    }, [user]);

    const updatePreference = async (key: 'emailEnabled' | 'pushEnabled', value: boolean) => {
        if (!user) return;

        // Optimistic update
        setPreferences(prev => ({ ...prev, [key]: value }));

        try {
            const prefRef = doc(db, `users/${user.uid}/preferences/notifications`);
            await setDoc(prefRef, { ...preferences, [key]: value }, { merge: true });
            toast.success(`${key === 'emailEnabled' ? 'Email' : 'Push'} notifications ${value ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error("Error updating preference:", error);
            toast.error("Failed to update preference");
            // Revert
            setPreferences(prev => ({ ...prev, [key]: !value }));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pl-64 transition-all duration-300">
            <Sidebar />

            <div className="max-w-2xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                        <p className="text-gray-500">Manage your app preferences</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center gap-3 mb-1">
                            <Bell className="w-5 h-5 text-[#4a6850]" />
                            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                        </div>
                        <p className="text-sm text-gray-500 ml-8">Choose how you want to be notified</p>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {/* Email Toggle */}
                        <div className="p-6 flex items-center justify-between">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Mail className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">Email Notifications</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Receive emails for new expenses and invites
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences.emailEnabled}
                                onCheckedChange={(checked) => updatePreference('emailEnabled', checked)}
                                disabled={loading}
                            />
                        </div>

                        {/* Push Toggle */}
                        <div className="p-6 flex items-center justify-between">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-purple-50 rounded-lg">
                                    <Smartphone className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">Push Notifications</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Receive mobile alerts for instant updates
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences.pushEnabled}
                                onCheckedChange={(checked) => updatePreference('pushEnabled', checked)}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-400">
                        Hostel Ledger v1.2.0 • Build 2026.02.15
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
