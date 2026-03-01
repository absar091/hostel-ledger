
import { useState } from "react";
import { useP2PTransactions } from "@/hooks/useP2PTransactions";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Check, X, Clock, Banknote, History, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SendMoneySheet from "@/components/SendMoneySheet";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "react-i18next";

export default function PersonalSpace() {
    const { t } = useTranslation();
    const { formatAmount } = useCurrency();
    const navigate = useNavigate();
    const { user } = useFirebaseAuth();
    const {
        loading,
        pendingIncoming,
        pendingOutgoing,
        completedHistory,
        respondToRequest
    } = useP2PTransactions();

    const [isSendMoneyOpen, setIsSendMoneyOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleResponse = async (id: string, accept: boolean) => {
        setProcessingId(id);
        await respondToRequest(id, accept);
        setProcessingId(null);
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2" aria-label="Go back">
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">{t('money_transfer.title')}</h1>
                </div>
                <p className="text-gray-500 text-sm ml-10">{t('money_transfer.subtitle')}</p>
            </div>

            <div className="p-4 space-y-6 max-w-md mx-auto">

                {/* Pending Incoming Requests (Needs Action) */}
                {pendingIncoming.length > 0 && (
                    <div className="space-y-3 animate-in slide-in-from-bottom-2">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4" /> {t('money_transfer.pending_requests')}
                        </h2>
                        {pendingIncoming.map((tx) => (
                            <Card key={tx.id} className="border-l-4 border-l-blue-500 shadow-sm overflow-hidden">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={tx.senderName} size="sm" />
                                            <div>
                                                <p className="font-medium text-gray-900 line-clamp-1">
                                                    {t('money_transfer.received_from')} <span className="font-bold">{tx.senderName}</span>
                                                </p>
                                                <p className="text-xs text-gray-500">{format(tx.timestamp, 'MMM d, h:mm a')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-lg font-bold text-green-600">+{formatAmount(tx.amount)}</span>
                                        </div>
                                    </div>

                                    {tx.note && (
                                        <div className="bg-gray-50 p-2 rounded-lg text-sm text-gray-600 mb-3 italic">
                                            "{tx.note}"
                                        </div>
                                    )}

                                    <div className="flex gap-3 mt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => handleResponse(tx.id, false)}
                                            disabled={!!processingId}
                                        >
                                            {processingId === tx.id ? "..." : <><X className="w-4 h-4 mr-1" /> {t('money_transfer.reject')}</>}
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleResponse(tx.id, true)}
                                            disabled={!!processingId}
                                        >
                                            {processingId === tx.id ? t('money_transfer.processing') : <><Check className="w-4 h-4 mr-1" /> {t('money_transfer.accept')}</>}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Pending Outgoing (Waiting) */}
                {pendingOutgoing.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4" /> {t('money_transfer.sent_requests')}
                        </h2>
                        {pendingOutgoing.map((tx) => (
                            <Card key={tx.id} className="border-l-4 border-l-yellow-400 shadow-sm opacity-90">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={tx.receiverName} size="sm" />
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {t('money_transfer.to')} <span className="font-bold">{tx.receiverName}</span>
                                            </p>
                                            <p className="text-xs text-gray-500">{format(tx.timestamp, 'MMM d')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-bold text-gray-900">{formatAmount(tx.amount)}</span>
                                        <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full inline-block mt-1">{t('money_transfer.pending')}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Recent History */}
                <div className="space-y-3 pt-4">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <History className="w-4 h-4" /> {t('money_transfer.recent_history')}
                    </h2>

                    {loading ? (
                        <div className="text-center py-8 text-gray-400 text-sm">{t('money_transfer.loading')}</div>
                    ) : completedHistory.length === 0 && pendingIncoming.length === 0 && pendingOutgoing.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                            <Banknote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-500">{t('money_transfer.no_tx')}</p>
                            <Button variant="link" onClick={() => setIsSendMoneyOpen(true)} className="text-[#4a6850]">
                                {t('money_transfer.send_first')}
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                            {completedHistory.length === 0 && !loading && (
                                <div className="p-4 text-center text-sm text-gray-400 italic">{t('money_transfer.no_completed')}</div>
                            )}
                            {completedHistory.map((tx) => {
                                const isReceived = tx.to === user.uid;
                                return (
                                    <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                                isReceived ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                            )}>
                                                {isReceived ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">
                                                    {isReceived ? tx.senderName : tx.receiverName}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {format(tx.timestamp, 'MMM d, h:mm a')}
                                                    {tx.status === 'rejected' && <span className="ml-2 text-red-500">({t('money_transfer.rejected')})</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "font-bold text-sm",
                                            isReceived ? "text-green-600" : "text-gray-900",
                                            tx.status === 'rejected' && "line-through opacity-50"
                                        )}>
                                            {isReceived ? "+" : "-"}{formatAmount(tx.amount)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-40">
                <Button
                    onClick={() => setIsSendMoneyOpen(true)}
                    className="h-14 w-14 rounded-full shadow-xl bg-[#4a6850] hover:bg-[#3d5a44] p-0 flex items-center justify-center"
                >
                    <Plus className="w-7 h-7 text-white" />
                </Button>
            </div>

            <SendMoneySheet
                isOpen={isSendMoneyOpen}
                onClose={() => setIsSendMoneyOpen(false)}
            />
        </div>
    );
}
