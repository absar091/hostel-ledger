import React from "react";
import { ArrowUpRight, ArrowDownLeft, CreditCard, Users, User, X, Share2, Copy } from "lucide-react";
import { toast } from "sonner";

interface TransactionDetailModalProps {
    transaction: any;
    onClose: () => void;
    groups: any[];
    user: any;
}

const TransactionDetailModal = ({ transaction, onClose, groups, user }: TransactionDetailModalProps) => {
    if (!transaction) return null;

    // Find the group for this transaction
    const transactionGroup = groups.find(g => g.id === transaction.groupId);

    const handleCopyId = () => {
        if (transaction.id) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(transaction.id)
                    .then(() => toast.success("Transaction ID copied! 📋"))
                    .catch(() => toast.error("Failed to copy ID"));
            } else {
                // Fallback for non-secure contexts or older browsers
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = transaction.id;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    toast.success("Transaction ID copied! 📋");
                } catch (err) {
                    toast.error("Clipboard access denied");
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md max-h-[90vh] overflow-hidden rounded-3xl shadow-[0_25px_70px_rgba(74,104,80,0.3)] border border-[#4a6850]/10 mx-auto">
                {/* Header with close button - iPhone Style */}
                <div className="flex items-center justify-between p-4 lg:p-6 border-b border-[#4a6850]/10 bg-gradient-to-r from-[#4a6850]/5 to-[#3d5643]/5 flex-shrink-0">
                    <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
                        <div className={`w-10 lg:w-12 h-10 lg:h-12 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-lg flex-shrink-0 ${transaction.type === 'expense' ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' :
                            transaction.type === 'payment' ? 'bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white' : 'bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white'
                            }`}>
                            {transaction.type === 'expense' ? (
                                <ArrowUpRight className="w-5 lg:w-6 h-5 lg:h-6 font-bold" />
                            ) : transaction.type === 'payment' ? (
                                <ArrowDownLeft className="w-5 lg:w-6 h-5 lg:h-6 font-bold" />
                            ) : (
                                <CreditCard className="w-5 lg:w-6 h-5 lg:h-6 font-bold" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="font-bold text-gray-900 text-base lg:text-lg tracking-tight truncate">Transaction Details</h2>
                            <p className="text-xs lg:text-sm text-[#4a6850]/80 capitalize font-medium truncate">{transaction.type}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-3 ml-3 lg:ml-4">
                        <button
                            onClick={async () => {
                                if (navigator.share) {
                                    try {
                                        const shareText = `🧾 Hostel Ledger Receipt\n\n` +
                                            `Title: ${transaction.title}\n` +
                                            `Amount: Rs ${transaction.amount.toLocaleString()}\n` +
                                            `Date: ${transaction.date}\n` +
                                            `${transaction.type === "expense" ? `Paid by: ${transaction.paidByName}` : `From: ${transaction.fromName} To: ${transaction.toName}`}\n\n` +
                                            `Transaction ID: ${transaction.id}\n\n` +
                                            `Shared via Hostel Ledger 🚀`;

                                        await navigator.share({
                                            title: 'Transaction Receipt',
                                            text: shareText,
                                        });
                                    } catch (err) {
                                        console.error('Error sharing:', err);
                                    }
                                }
                            }}
                            className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                        >
                            <Share2 className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" />
                        </button>
                        <button
                            onClick={onClose}
                            className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                        >
                            <X className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {/* Scrollable content - iPhone Style */}
                <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                    <div className="p-4 lg:p-6">
                        {/* Transaction header - iPhone Style */}
                        <div className="text-center mb-6 lg:mb-8">
                            <h3 className="text-lg lg:text-2xl font-bold text-gray-900 mb-2 lg:mb-3 tracking-tight truncate px-2">{transaction.title}</h3>
                            <div className="text-3xl lg:text-5xl font-black text-gray-900 mb-1.5 lg:mb-2 tracking-tighter tabular-nums">
                                Rs {transaction.amount.toLocaleString()}
                            </div>

                            {/* Transaction ID - New addition */}
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded truncate max-w-[200px]">
                                    {transaction.id}
                                </span>
                                <button
                                    onClick={handleCopyId}
                                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-[#4a6850] transition-all"
                                    title="Copy ID"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {transaction.type === 'expense' && transaction.paidBy !== user?.uid && (
                                <div className="mb-2">
                                    {(() => {
                                        const userPart = transaction.participants?.find((p: any) => p.id === user?.uid);
                                        if (userPart) {
                                            return (
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                                                    <span className="text-xs font-black uppercase tracking-wider">Your Share: Rs {userPart.amount.toLocaleString()}</span>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100 shadow-sm">
                                                    <span className="text-xs font-black uppercase tracking-wider">Not a participant</span>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            )}
                            <div className="text-xs lg:text-sm text-[#4a6850]/80 font-medium">
                                {transaction.date}
                                {transaction.timestamp && ` • ${new Date(transaction.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                            </div>
                        </div>

                        <div className="space-y-3 lg:space-y-4">
                            {/* Group Information - iPhone Style */}
                            {transactionGroup && (
                                <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                    <Users className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Group</div>
                                        <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">{transactionGroup.name}</div>
                                        <div className="text-xs lg:text-sm text-[#4a6850]/80 font-medium">{transactionGroup.members.length} members</div>
                                    </div>
                                </div>
                            )}

                            {/* Paid By (for expenses) - iPhone Style */}
                            {transaction.paidByName && (
                                <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                    <User className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Paid by</div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">{transaction.paidByName}</div>
                                            {transaction.paidByIsTemporary && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">Temp</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment Details (for payments) - iPhone Style */}
                            {transaction.fromName && transaction.toName && (
                                <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                    <ArrowUpRight className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Payment</div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">{transaction.fromName} → {transaction.toName}</div>
                                            {(transaction.fromIsTemporary || transaction.toIsTemporary) && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">Temp</span>
                                            )}
                                        </div>
                                        {transaction.method && (
                                            <div className="text-xs lg:text-sm text-[#4a6850]/80 capitalize font-medium">via {transaction.method}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Participants (for expenses) - iPhone Style */}
                            {transaction.participants && transaction.participants.length > 0 && (
                                <div className="p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                    <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-3 lg:mb-4 font-semibold uppercase tracking-wide">Participants ({transaction.participants.length})</div>
                                    <div className="space-y-2 lg:space-y-3 max-h-32 overflow-y-auto scrollbar-hide">
                                        {transaction.participants.map((participant: any, index: number) => (
                                            <div key={index} className="flex justify-between items-center gap-2">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className="font-semibold text-gray-900 truncate text-sm lg:text-base">{participant.name}</span>
                                                    {participant.isTemporary && (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">Temp</span>
                                                    )}
                                                </div>
                                                <span className="text-xs lg:text-sm text-[#4a6850] flex-shrink-0 font-bold tabular-nums">Rs {participant.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Place (for expenses) - iPhone Style */}
                            {transaction.place && (
                                <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                    <div className="w-5 lg:w-6 h-5 lg:h-6 rounded-full bg-[#4a6850]/20 flex-shrink-0 flex items-center justify-center">
                                        <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-[#4a6850]"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Place</div>
                                        <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">{transaction.place}</div>
                                    </div>
                                </div>
                            )}

                            {/* Note - iPhone Style */}
                            {transaction.note && (
                                <div className="p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                    <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-2 lg:mb-3 font-semibold uppercase tracking-wide">Note</div>
                                    <div className="font-medium text-gray-900 break-words leading-relaxed text-sm lg:text-base">{transaction.note}</div>
                                </div>
                            )}

                            {/* Wallet Balance Changes (for wallet transactions) - iPhone Style */}
                            {(transaction.walletBalanceBefore !== undefined || transaction.walletBalanceAfter !== undefined) && (
                                <div className="space-y-3 lg:space-y-4">
                                    {transaction.walletBalanceBefore !== undefined && (
                                        <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl lg:rounded-3xl border border-gray-200 shadow-lg">
                                            <CreditCard className="w-5 lg:w-6 h-5 lg:h-6 text-gray-500 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] lg:text-xs text-gray-500 font-semibold uppercase tracking-wide">Wallet Balance Before</div>
                                                <div className="font-bold text-gray-900 text-sm lg:text-base tracking-tight tabular-nums">Rs {transaction.walletBalanceBefore.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    )}

                                    {transaction.walletBalanceAfter !== undefined && (
                                        <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                            <CreditCard className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Wallet Balance After</div>
                                                <div className="font-bold text-gray-900 text-sm lg:text-base tracking-tight tabular-nums">Rs {transaction.walletBalanceAfter.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Fixed footer with close button - iPhone Style */}
                <div className="p-6 border-t border-[#4a6850]/10 bg-white flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionDetailModal;
