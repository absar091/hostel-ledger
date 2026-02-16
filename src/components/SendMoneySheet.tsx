
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, AlertCircle, Banknote, User } from "lucide-react";
import Avatar from "./Avatar";
import { useP2PTransactions } from "@/hooks/useP2PTransactions";
import { getValidUserDetails } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce"; // Assuming this exists, otherwise I'll implement simple debounce

interface SendMoneySheetProps {
    isOpen: boolean;
    onClose: () => void;
    prefilledRecipient?: string;
}

export default function SendMoneySheet({ isOpen, onClose, prefilledRecipient }: SendMoneySheetProps) {
    const { sendMoney } = useP2PTransactions();

    const [username, setUsername] = useState(prefilledRecipient || "");
    const [debouncedUsername, setDebouncedUsername] = useState(username);

    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [recipientPeer, setRecipientPeer] = useState<{ uid: string; name: string; photoURL: string | null; username: string } | null>(null);
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
                    // Check if it's not the same as sender? The API doesn't prevent checking self, but sendMoney does.
                    // We'll catch self-send on submit or ideally here if we had current user context available easily without circular deps.
                    // But sendMoney will fail if self.
                    setRecipientPeer(result.user);
                } else {
                    setRecipientPeer(null);
                    setUserError("User not found");
                }
            } catch (error) {
                setRecipientPeer(null);
                setUserError("Error finding user");
            } finally {
                setIsCheckingUser(false);
            }
        }

        checkUser();
    }, [debouncedUsername]);

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

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="bottom"
                className="h-[85vh] sm:h-[600px] rounded-t-3xl p-0 flex flex-col border-t border-[#4a6850]/10 z-[100]"
            >
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                <SheetHeader className="px-6 pb-2 text-center shrink-0">
                    <SheetTitle className="text-xl font-bold text-center">Send Money</SheetTitle>
                    <SheetDescription className="text-center text-[#4a6850]/80">
                        Transfer funds securely to friends
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {/* Recipient Search */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 ml-1">Recipient Username</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g. @john_doe"
                                className="pl-10 h-14 rounded-2xl border-[#4a6850]/20 bg-white"
                                autoCapitalize="none"
                                autoCorrect="off"
                            />
                        </div>

                        {/* User Feedback Status */}
                        {isCheckingUser && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 ml-1 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-gray-400" /> Checking...
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
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 ml-1">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-lg">Rs</span>
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
                                <label className="text-sm font-medium text-gray-700 ml-1">Note (Optional)</label>
                                <Input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="What's this for?"
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
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Sending...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                Send Money <Banknote className="w-5 h-5" />
                            </div>
                        )}
                    </Button>
                </div>

            </SheetContent>
        </Sheet>
    );
}
