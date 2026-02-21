
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, AlertCircle, Banknote, Info } from "lucide-react";
import Avatar from "./Avatar";
import { useP2PTransactions } from "@/hooks/useP2PTransactions";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { getValidUserDetails } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";
import { getCurrency } from "@/lib/currency";

interface SendMoneySheetProps {
    isOpen: boolean;
    onClose: () => void;
    prefilledRecipient?: string;
}

export default function SendMoneySheet({ isOpen, onClose, prefilledRecipient }: SendMoneySheetProps) {
    const { t } = useTranslation();
    const { symbol } = useCurrency();
    const { user: currentUser } = useFirebaseAuth();
    const { sendMoney } = useP2PTransactions();

    const [username, setUsername] = useState(prefilledRecipient || "");
    const [debouncedUsername, setDebouncedUsername] = useState(username);

    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [recipientPeer, setRecipientPeer] = useState<{ uid: string; name: string; photoURL: string | null; username: string; currency?: string } | null>(null);
    const [isCheckingUser, setIsCheckingUser] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);

    // Simple debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedUsername(username);
        }, 500);
        return () => clearTimeout(timer);
    }, [username]);

    // Check user existence
    useEffect(() => {
        async function checkUser() {
            if (!debouncedUsername || debouncedUsername.length < 3) {
                setRecipientPeer(null);
                setUserError(null);
                return;
            }

            setIsCheckingUser(true);
            setUserError(null);

            try {
                const result = await getValidUserDetails(debouncedUsername);
                if (result.success && result.exists) {
                    setRecipientPeer(result.user);
                } else {
                    setRecipientPeer(null);
                    setUserError(t('send_money.user_not_found'));
                }
            } catch (error) {
                setRecipientPeer(null);
                setUserError(t('send_money.error_finding_user'));
            } finally {
                setIsCheckingUser(false);
            }
        }

        checkUser();
    }, [debouncedUsername, t]);

    const handleSubmit = async () => {
        if (!recipientPeer || !amount) return;

        setIsSubmitting(true);
        try {
            const result = await sendMoney(username, Number(amount), note);
            if (result.success) {
                onClose();
                // Reset form
                setUsername("");
                setAmount("");
                setNote("");
                setRecipientPeer(null);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasCurrencyMismatch = recipientPeer && currentUser && recipientPeer.currency !== (currentUser.currency || 'PKR');
    const recipientCurrencyDetails = recipientPeer?.currency ? getCurrency(recipientPeer.currency) : null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="bottom"
                className="h-[85vh] sm:h-[600px] rounded-t-3xl p-0 flex flex-col border-t border-[#4a6850]/10 z-[100]"
            >
                {/* Loading Overlay */}
                {isSubmitting && (
                    <div className="absolute inset-0 z-[150] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
                        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                        <h3 className="text-lg font-black text-slate-900">{t('sheets.add_expense.processing')}</h3>
                    </div>
                )}

                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                <SheetHeader className="px-6 pb-2 text-center shrink-0">
                    <SheetTitle className="text-xl font-bold text-center">{t('send_money.title')}</SheetTitle>
                    <SheetDescription className="text-center text-[#4a6850]/80">
                        {t('send_money.subtitle')}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {/* Recipient Search */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 ml-1">{t('send_money.recipient_label')}</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={t('send_money.recipient_placeholder')}
                                className="pl-10 h-14 rounded-2xl border-[#4a6850]/20 bg-white"
                                autoCapitalize="none"
                                autoCorrect="off"
                            />
                        </div>

                        {/* User Feedback Status */}
                        {isCheckingUser && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 ml-1 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-gray-400" /> {t('send_money.checking_user')}
                            </div>
                        )}

                        {userError && !isCheckingUser && username.length >= 3 && (
                            <div className="flex items-center gap-2 text-sm text-red-500 ml-1">
                                <AlertCircle className="w-4 h-4" /> {userError}
                            </div>
                        )}

                        {/* Found User Card */}
                        {recipientPeer && !isCheckingUser && (
                            <div className="bg-gradient-to-br from-[#e8f5e9] to-white p-4 rounded-2xl border border-[#4a6850]/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                <Avatar photoURL={recipientPeer.photoURL} name={recipientPeer.name} size="md" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{recipientPeer.name}</h4>
                                    <p className="text-sm text-[#4a6850]">@{recipientPeer.username}</p>
                                </div>
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                        )}
                    </div>

                    {/* Amount & Note - Only show if user found */}
                    {recipientPeer && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {hasCurrencyMismatch && (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 items-start animate-in zoom-in-95 duration-300">
                                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-800 font-medium leading-relaxed">
                                        {t('send_money.currency_warning', {
                                            currency: recipientCurrencyDetails?.symbol || recipientPeer.currency,
                                            amount: symbol + (amount || '0')
                                        })}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 ml-1">{t('send_money.amount')}</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-lg">{symbol}</span>
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0"
                                        className="pl-12 h-14 rounded-2xl border-[#4a6850]/20 bg-white text-lg font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 ml-1">{t('send_money.note_optional')}</label>
                                <Input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder={t('send_money.note_placeholder')}
                                    className="h-14 rounded-2xl border-[#4a6850]/20 bg-white"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-white shrink-0 pb-8">
                    <Button
                        onClick={handleSubmit}
                        disabled={!recipientPeer || !amount || Number(amount) <= 0 || isSubmitting}
                        className={cn(
                            "w-full h-14 text-lg rounded-2xl shadow-lg transition-all",
                            "bg-gradient-to-br from-[#4a6850] to-[#2d4a33] hover:from-[#3d5a44] hover:to-[#223d28]"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {t('send_money.send_btn')} <Banknote className="w-5 h-5" />
                        </div>
                    </Button>
                </div>

            </SheetContent>
        </Sheet>
    );
}
