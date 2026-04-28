/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState } from "react";
import { ArrowUpRight, ArrowDownLeft, CreditCard, Users, User, X, Share2, Copy, Download, Image, Check, MessageSquareText, MapPin } from "lucide-react";
import ExpenseThreadSheet from "./ExpenseThreadSheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { useCurrency } from "@/contexts/CurrencyContext";

interface TransactionDetailModalProps {
    transaction: any;
    onClose: () => void;
    groups: any[];
    user: any;
}

const TransactionDetailModal = ({ transaction, onClose, groups, user }: TransactionDetailModalProps) => {
    const { formatAmount } = useCurrency();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [showChat, setShowChat] = useState(false);

    if (!transaction) return null;

    // Find the group for this transaction
    const transactionGroup = groups.find(g => g.id === transaction.groupId);

    // DYNAMICALLY RESOLVE NAMES (Fixes "Paid by You" bug)
    // 1. Resolve Payer Name
    const payerMember = transactionGroup?.members.find((m: any) => m.id === transaction.paidBy);

    // Improved check: Match by ID OR by userId (for invited members)
    const isCurrentUserPayer = transaction.paidBy === user?.uid || (payerMember && payerMember.userId === user?.uid);

    const resolvedPaidByName = isCurrentUserPayer
        ? "You"
        : (payerMember?.name || transaction.paidByName || "Unknown");

    const isTemporaryPayer = payerMember?.isTemporary || transaction.paidByIsTemporary;
    // 3. Resolve Multiple Payers
    const payersList = transaction.payers || (transaction.paidBy ? [{ id: transaction.paidBy, amount: transaction.amount }] : []);
    const resolvedPayers = payersList.map((p: any) => {
        const member = transactionGroup?.members.find((m: any) => m.id === p.id);
        const isCurrentUser = p.id === user?.uid || (member && member.userId === user?.uid);
        const name = isCurrentUser ? "You" : (member?.name || p.name || "Unknown");
        return {
            ...p,
            name,
            amount: p.amount || transaction.amount // Fallback
        };
    });
    const isMultiPayer = resolvedPayers.length > 1;


    // 2. Resolve Participant Names
    const participantsList = Array.isArray(transaction.participants)
        ? transaction.participants
        : transaction.participants ? Object.entries(transaction.participants).map(([id, data]: [string, any]) => ({ id, ...data })) : [];

    const resolvedParticipants = participantsList.map((p: any) => {
        const member = transactionGroup?.members.find((m: any) => m.id === p.id);
        const isCurrentUserParticipant = p.id === user?.uid || (member && member.userId === user?.uid);

        const name = isCurrentUserParticipant
            ? "You"
            : (member?.name || p.name || "Unknown");

        return {
            ...p,
            name,
            isTemporary: member?.isTemporary || p.isTemporary,
            userId: member?.userId // Store userId for later lookup
        };
    });

    // 4. Resolve From/To Names for payments
    const fromMember = transactionGroup?.members.find((m: any) => m.id === transaction.from);
    const toMember = transactionGroup?.members.find((m: any) => m.id === transaction.to);
    const resolvedFromName = (transaction.from === user?.uid || fromMember?.userId === user?.uid)
        ? "You" : (fromMember?.name || transaction.fromName || "Unknown");
    const resolvedToName = (transaction.to === user?.uid || toMember?.userId === user?.uid)
        ? "You" : (toMember?.name || transaction.toName || "Unknown");

    const handleCopyId = () => {
        if (transaction.id && transaction.groupId) {
            const reference = `${transaction.groupId}/${transaction.id}`;
            const onSuccess = () => {
                toast.success("Reference copied! Paste in chat to share 📋");
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(reference)
                    .then(onSuccess)
                    .catch(() => toast.error("Failed to copy reference"));
            } else {
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = reference;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    onSuccess();
                } catch (err) {
                    toast.error("Clipboard access denied");
                }
            }
        }
    };

    // Generate receipt image and share/download
    const handleShareAsImage = async () => {
        if (!receiptRef.current || isGenerating) return;
        setIsGenerating(true);

        const loadingToast = toast.loading("Generating receipt image...");

        try {
            // Make receipt visible for capture
            receiptRef.current.style.position = 'fixed';
            receiptRef.current.style.left = '-9999px';
            receiptRef.current.style.top = '0';
            receiptRef.current.style.display = 'block';
            receiptRef.current.style.zIndex = '-1';

            // Wait for render
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#ffffff',
                scale: 3, // High resolution
                useCORS: true,
                logging: false,
                width: 420,
                windowWidth: 420,
            });

            // Hide receipt again
            receiptRef.current.style.display = 'none';

            // Convert to blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error("Failed to create image"));
                }, 'image/png', 1.0);
            });

            const fileName = `hostel-ledger-receipt-${transaction.id?.slice(-8) || 'txn'}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            toast.dismiss(loadingToast);

            // Try native share with file
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                try {
                    await navigator.share({
                        title: 'Transaction Receipt - Hostel Ledger',
                        text: `Receipt for ${formatAmount(transaction.amount)}`,
                        files: [file],
                    });
                    toast.success("Receipt shared! 🧾");
                } catch (err: any) {
                    if (err.name !== 'AbortError') {
                        // Fallback to download
                        downloadImage(canvas, fileName);
                    }
                }
            } else {
                // Fallback: download the image
                downloadImage(canvas, fileName);
            }
        } catch (error) {
            console.error("Failed to generate receipt image:", error);
            toast.dismiss(loadingToast);
            toast.error("Failed to generate receipt image");
            // Hide receipt on error
            if (receiptRef.current) {
                receiptRef.current.style.display = 'none';
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadImage = (canvas: HTMLCanvasElement, fileName: string) => {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        toast.success("Receipt downloaded! 📥");
    };

    // Format date for receipt
    const receiptDate = transaction.date +
        (transaction.timestamp ? ` • ${new Date(transaction.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : '');

    return (
        <>
            <div className={`fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 ${showChat ? 'hidden' : ''}`}>
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
                            <TooltipProvider delayDuration={300}>
                                {/* Share as Image button */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={handleShareAsImage}
                                            disabled={isGenerating}
                                            className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                                            aria-label="Share as Image"
                                        >
                                            {isGenerating ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Image className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
                                        <p>Share as Image</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={onClose}
                                            className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                                            aria-label="Close"
                                        >
                                            <X className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" strokeWidth={3} />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
                                        <p>Close</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    {/* Scrollable content - iPhone Style */}
                    <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                        <div className="p-4 lg:p-6">
                            {/* Transaction header - iPhone Style */}
                            <div className="text-center mb-6 lg:mb-8">
                                <h3 className="text-lg lg:text-2xl font-bold text-gray-900 mb-2 lg:mb-3 tracking-tight truncate px-2">{transaction.title}</h3>
                                <div className="text-3xl lg:text-5xl font-black text-gray-900 mb-1.5 lg:mb-2 tracking-tighter tabular-nums">
                                    {formatAmount(transaction.amount)}
                                </div>

                                {/* Transaction ID - Full Reference for sharing */}
                                <div className="flex flex-col items-center gap-2 mb-6">
                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 shadow-sm transition-all hover:border-emerald-200 group">
                                        <div className="flex flex-col items-start">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Share Reference</span>
                                            <span className="text-[11px] font-mono font-bold text-[#4a6850] truncate max-w-[220px]">
                                                {transaction.groupId}/{transaction.id}
                                            </span>
                                        </div>
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={handleCopyId}
                                                        className={`p-2 rounded-full transition-all ${isCopied
                                                            ? "bg-emerald-100 text-emerald-600 scale-110"
                                                            : "bg-white text-slate-400 hover:text-emerald-600 shadow-sm border border-slate-100 group-hover:border-emerald-200"
                                                            }`}
                                                        aria-label={isCopied ? "Copied!" : "Copy Reference"}
                                                    >
                                                        {isCopied ? (
                                                            <Check className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800">
                                                    <p>{isCopied ? "Copied!" : "Copy Reference"}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>

                                {/* Badge Logic Fixed: Check if user is payer properly, and use resolvedParticipants */}
                                {transaction.type === 'expense' && !isCurrentUserPayer && (
                                    <div className="mb-2">
                                        {(() => {
                                            // Use resolvedParticipants to handle object/array and userId lookup
                                            const userPart = resolvedParticipants.find((p: any) =>
                                                p.id === user?.uid || (p.userId && p.userId === user?.uid)
                                            );

                                            if (userPart) {
                                                return (
                                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                                                        <span className="text-xs font-black uppercase tracking-wider">Your Share: {formatAmount(userPart.amount)}</span>
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
                                    {transaction.date || (transaction.timestamp ? new Date(transaction.timestamp).toLocaleDateString() : 'Unknown Date')}
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
                                            <div className="text-xs lg:text-sm text-[#4a6850]/80 font-medium">
                                                {Array.isArray(transactionGroup.members)
                                                    ? transactionGroup.members.length
                                                    : Object.keys(transactionGroup.members || {}).length} members
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Paid By (for expenses) - iPhone Style */}
                                {transaction.paidByName && !isMultiPayer && (
                                    <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                        <div className="relative">
                                            <User className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                                            {transactionGroup?.createdBy === transaction.paidBy && (
                                                <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1 py-0.5 rounded-full shadow-sm border border-yellow-200">
                                                    OWNER
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Paid by</div>
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">
                                                    {transactionGroup?.createdBy === transaction.paidBy && !isCurrentUserPayer ? "Group Owner" : resolvedPaidByName}
                                                </div>
                                                {isTemporaryPayer && (
                                                    <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">Temp</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Details (for payments) - iPhone Style */}

                                {/* Multiple Payers - iPhone Style */}
                                {isMultiPayer && (
                                    <div className="p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                        <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-3 lg:mb-4 font-semibold uppercase tracking-wide">Paid By ({resolvedPayers.length})</div>
                                        <div className="space-y-2 lg:space-y-3 max-h-32 overflow-y-auto scrollbar-hide">
                                            {resolvedPayers.map((payer: any, index: number) => {
                                                const isOwner = transactionGroup?.createdBy === payer.id;
                                                const isMe = payer.id === user?.uid;
                                                return (
                                                    <div key={index} className="flex justify-between items-center gap-2">
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <span className="font-semibold text-gray-900 truncate text-sm lg:text-base">
                                                                {isOwner && !isMe ? "Group Owner" : payer.name}
                                                            </span>
                                                            {isOwner && (
                                                                <span className="bg-yellow-100 text-yellow-700 text-[8px] px-1 rounded font-black border border-yellow-200 uppercase tracking-wide">Owner</span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs lg:text-sm text-[#4a6850] flex-shrink-0 font-bold tabular-nums">{formatAmount(payer.amount)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {transaction.fromName && transaction.toName && (
                                    <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                        <ArrowUpRight className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Payment From</div>
                                            <div className="flex flex-col gap-1">
                                                {/* FROM USER */}
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">
                                                        {transactionGroup?.createdBy === transaction.from && transaction.from !== user?.uid ? "Group Owner" : (transaction.from === user?.uid ? "You" : transaction.fromName)}
                                                    </div>
                                                    {transactionGroup?.createdBy === transaction.from && (
                                                        <span className="bg-yellow-100 text-yellow-700 text-[8px] px-1 rounded font-black border border-yellow-200 uppercase tracking-wide">Owner</span>
                                                    )}
                                                </div>

                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">TO</div>

                                                {/* TO USER */}
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">
                                                        {transactionGroup?.createdBy === transaction.to && transaction.to !== user?.uid ? "Group Owner" : (transaction.to === user?.uid ? "You" : transaction.toName)}
                                                    </div>
                                                    {transactionGroup?.createdBy === transaction.to && (
                                                        <span className="bg-yellow-100 text-yellow-700 text-[8px] px-1 rounded font-black border border-yellow-200 uppercase tracking-wide">Owner</span>
                                                    )}
                                                </div>
                                            </div>

                                            {transaction.method && (
                                                <div className="text-xs lg:text-sm text-[#4a6850]/80 capitalize font-medium mt-2">via {transaction.method}</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Participants (for expenses) - iPhone Style */}
                                {transaction.participants && transaction.participants.length > 0 && (
                                    <div className="p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                        <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-3 lg:mb-4 font-semibold uppercase tracking-wide">Participants ({transaction.participants.length})</div>
                                        <div className="space-y-2 lg:space-y-3 max-h-32 overflow-y-auto scrollbar-hide">

                                            {resolvedParticipants?.map((participant: any, index: number) => {
                                                const isOwner = transactionGroup?.createdBy === participant.id;
                                                const isMe = participant.id === user?.uid || (participant.userId && participant.userId === user?.uid);
                                                return (
                                                    <div key={index} className="flex justify-between items-center gap-2">
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <span className="font-semibold text-gray-900 truncate text-sm lg:text-base">
                                                                {isOwner && !isMe ? "Group Owner" : participant.name}
                                                            </span>
                                                            {isOwner && (
                                                                <span className="bg-yellow-100 text-yellow-700 text-[8px] px-1 rounded font-black border border-yellow-200 uppercase tracking-wide">Owner</span>
                                                            )}
                                                            {participant.isTemporary && (
                                                                <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">Temp</span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs lg:text-sm text-[#4a6850] flex-shrink-0 font-bold tabular-nums">{formatAmount(participant.amount)}</span>
                                                    </div>
                                                );
                                            })}

                                        </div>
                                    </div>
                                )}

                                {/* Place (for expenses) - iPhone Style */}
                                {transaction.place && (
                                    <div className="flex flex-col p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg gap-4">
                                        <div className="flex items-center gap-3 lg:gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-[#4a6850]/10 flex-shrink-0 flex items-center justify-center">
                                                <MapPin className="w-5 h-5 text-[#4a6850]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Place</div>
                                                <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">{transaction.place}</div>
                                            </div>
                                        </div>

                                        {transaction.location && (
                                            <div className="mt-3 flex gap-4 bg-white/50 p-3 rounded-2xl border border-[#4a6850]/10 shadow-sm">
                                                {/* Visual Map Preview (Small Square) */}
                                                <div
                                                    className="relative w-24 h-24 rounded-xl overflow-hidden shadow-md flex-shrink-0 cursor-pointer group"
                                                    onClick={() => {
                                                        const url = `https://www.google.com/maps/search/?api=1&query=${transaction.location?.lat},${transaction.location?.lng}`;
                                                        window.open(url, '_blank');
                                                    }}
                                                >
                                                    <img
                                                        src={`https://static-maps.yandex.ru/1.x/?ll=${transaction.location.lng},${transaction.location.lat}&size=200,200&z=15&l=map&pt=${transaction.location.lng},${transaction.location.lat},pm2rdm`}
                                                        alt="Map Location"
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg">
                                                            <ArrowUpRight className="w-4 h-4 text-[#4a6850]" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-center gap-2">
                                                    <span className="text-xs text-[#4a6850]/80 font-mono font-bold bg-[#4a6850]/5 px-2 py-1 rounded-lg border border-[#4a6850]/10">
                                                        {transaction.location.lat.toFixed(4)}, {transaction.location.lng.toFixed(4)}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            const url = `https://www.google.com/maps/search/?api=1&query=${transaction.location?.lat},${transaction.location?.lng}`;
                                                            window.open(url, '_blank');
                                                        }}
                                                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-black uppercase tracking-wider hover:underline w-fit"
                                                    >
                                                        View on Maps <ArrowUpRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Note - iPhone Style */}
                                {transaction.note && (
                                    <div className="p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                        <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-2 lg:mb-3 font-semibold uppercase tracking-wide">Note</div>
                                        <div className="font-medium text-gray-900 break-words leading-relaxed text-sm lg:text-base">{transaction.note}</div>
                                    </div>
                                )}

                                {/* Phase 2: Discuss Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowChat(true);
                                    }}
                                    className="w-full flex items-center justify-between p-4 lg:p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl lg:rounded-3xl border border-blue-200 shadow-lg group hover:from-blue-100 hover:to-blue-200 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3 lg:gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                            <MessageSquareText className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">Discussion</div>
                                            <div className="font-black text-blue-900 text-sm lg:text-base">Discuss this expense</div>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center">
                                        <ArrowUpRight className="w-4 h-4 text-blue-600" />
                                    </div>
                                </button>

                                {/* Wallet Balance Changes - Intelligent Display */}
                                {/* Priority 1: Use new per-user snapshots if available */}
                                {/* Priority 2: Fallback to legacy fields for Recorder (Payer/Sender) */}
                                {(() => {
                                    let balanceBefore: number | undefined;
                                    let balanceAfter: number | undefined;
                                    let showBalance = false;

                                    // Check for new data structure (Supports both Payer & Receiver)
                                    const userSnapshot = transaction.walletBalances?.[user?.uid];

                                    if (userSnapshot) {
                                        balanceBefore = userSnapshot.before;
                                        balanceAfter = userSnapshot.after;
                                        showBalance = true;
                                    }
                                    // Fallback logic for older transactions (Only accurate for Recorder)
                                    else if ((transaction.type === 'expense' && isCurrentUserPayer) ||
                                        (transaction.type === 'payment' && transaction.from === user?.uid)) {
                                        balanceBefore = transaction.walletBalanceBefore;
                                        balanceAfter = transaction.walletBalanceAfter;
                                        showBalance = true;
                                    }

                                    if (!showBalance || (balanceBefore === undefined && balanceAfter === undefined)) return null;

                                    return (
                                        <div className="space-y-3 lg:space-y-4">
                                            {balanceBefore !== undefined && (
                                                <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl lg:rounded-3xl border border-gray-200 shadow-lg">
                                                    <CreditCard className="w-5 lg:w-6 h-5 lg:h-6 text-gray-500 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] lg:text-xs text-gray-500 font-semibold uppercase tracking-wide">Wallet Balance Before</div>
                                                        <div className="font-bold text-gray-900 text-sm lg:text-base tracking-tight tabular-nums">{formatAmount(balanceBefore)}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {balanceAfter !== undefined && (
                                                <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                                    <CreditCard className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Wallet Balance After</div>
                                                        <div className={`font-bold text-sm lg:text-base tracking-tight tabular-nums ${(balanceAfter > (balanceBefore || 0)) ? 'text-green-600' : 'text-gray-900'
                                                            }`}>
                                                            {formatAmount(balanceAfter)}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
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

            {/* Phase 2: Expense Thread Sheet */}
            {transactionGroup && (
                <ExpenseThreadSheet
                    isOpen={showChat}
                    onClose={() => {
                        setShowChat(false);
                        onClose(); // Automatically fully close the modal after chat
                    }}
                    groupId={transaction.groupId}
                    groupName={transactionGroup.name || "Group"}
                    expenseId={transaction.id}
                    expenseTitle={transaction.title || "Expense"}
                />
            )}

            {/* ========== HIDDEN RECEIPT FOR IMAGE GENERATION ========== */}
            <div
                ref={receiptRef}
                style={{
                    display: 'none',
                    width: '420px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
            >
                <div style={{
                    background: 'linear-gradient(135deg, #4a6850 0%, #3d5643 50%, #2f4a35 100%)',
                    padding: '32px 24px 20px',
                    color: 'white',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '4px' }}>
                        Hostel Ledger
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const }}>
                        Transaction Receipt
                    </div>
                </div>

                <div style={{ background: '#ffffff', padding: '24px' }}>
                    {/* Title & Amount */}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{
                            display: 'inline-block',
                            padding: '4px 14px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase' as const,
                            letterSpacing: '1px',
                            marginBottom: '12px',
                            background: transaction.type === 'expense' ? '#FEF2F2' : '#F0FDF4',
                            color: transaction.type === 'expense' ? '#DC2626' : '#16A34A',
                            border: `1px solid ${transaction.type === 'expense' ? '#FECACA' : '#BBF7D0'}`,
                        }}>
                            {transaction.type}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                            {transaction.title}
                        </div>
                        <div style={{ fontSize: '42px', fontWeight: 900, color: '#111827', letterSpacing: '-2px', lineHeight: 1.1 }}>
                            {formatAmount(transaction.amount)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', fontWeight: 500 }}>
                            {receiptDate}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, #E5E7EB, transparent)', margin: '0 0 20px' }} />

                    {/* Details */}
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                        {/* Group */}
                        {transactionGroup && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '14px 16px', background: '#F9FAFB', borderRadius: '16px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ fontSize: '20px' }}>{transactionGroup.emoji || '👥'}</div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Group</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{transactionGroup.name}</div>
                                </div>
                            </div>
                        )}

                        {/* Paid By */}
                        {resolvedPaidByName && !isMultiPayer && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '14px 16px', background: '#F9FAFB', borderRadius: '16px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4a6850', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>
                                    {resolvedPaidByName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Paid By</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{resolvedPaidByName}</div>
                                </div>
                            </div>
                        )}

                        {/* Payment (from → to) */}

                        {/* Multiple Payers - iPhone Style */}
                        {isMultiPayer && (
                            <div className="p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-3 lg:mb-4 font-semibold uppercase tracking-wide">Paid By ({resolvedPayers.length})</div>
                                <div className="space-y-2 lg:space-y-3 max-h-32 overflow-y-auto scrollbar-hide">
                                    {resolvedPayers.map((payer: any, index: number) => {
                                        const isOwner = transactionGroup?.createdBy === payer.id;
                                        const isMe = payer.id === user?.uid;
                                        return (
                                            <div key={index} className="flex justify-between items-center gap-2">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className="font-semibold text-gray-900 truncate text-sm lg:text-base">
                                                        {isOwner && !isMe ? "Group Owner" : payer.name}
                                                    </span>
                                                    {isOwner && (
                                                        <span className="bg-yellow-100 text-yellow-700 text-[8px] px-1 rounded font-black border border-yellow-200 uppercase tracking-wide">Owner</span>
                                                    )}
                                                </div>
                                                <span className="text-xs lg:text-sm text-[#4a6850] flex-shrink-0 font-bold tabular-nums">{formatAmount(payer.amount)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}


                        {/* Multi Payers Receipt */}
                        {isMultiPayer && (
                            <div style={{
                                padding: '14px 16px', background: '#F9FAFB', borderRadius: '16px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '10px' }}>
                                    Paid By ({resolvedPayers.length})
                                </div>
                                {resolvedPayers.map((p: any, i: number) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '6px 0',
                                        borderBottom: i < resolvedPayers.length - 1 ? '1px solid #F3F4F6' : 'none'
                                    }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{p.name}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#4a6850' }}>{formatAmount(p.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {transaction.fromName && transaction.toName && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '14px 16px', background: '#F9FAFB', borderRadius: '16px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4a6850', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>
                                    →
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Payment</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{resolvedFromName} → {resolvedToName}</div>
                                    {transaction.method && (
                                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, textTransform: 'capitalize' as const }}>Via {transaction.method}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Participants */}
                        {transaction.participants && transaction.participants.length > 0 && (
                            <div style={{
                                padding: '14px 16px', background: '#F9FAFB', borderRadius: '16px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '10px' }}>
                                    Split Between ({resolvedParticipants?.length || 0})
                                </div>
                                {resolvedParticipants?.map((p: any, i: number) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '6px 0',
                                        borderBottom: i < transaction.participants.length - 1 ? '1px solid #F3F4F6' : 'none'
                                    }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{p.name}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#4a6850' }}>{formatAmount(p.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Place */}
                        {transaction.place && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '14px 16px', background: '#F9FAFB', borderRadius: '16px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>📍</div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Place</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{transaction.place}</div>
                                    {transaction.location && (
                                        <div style={{ fontSize: '9px', color: '#6B7280', fontFamily: 'monospace', marginTop: '2px' }}>
                                            {transaction.location.lat.toFixed(4)}, {transaction.location.lng.toFixed(4)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Note */}
                        {transaction.note && (
                            <div style={{
                                padding: '14px 16px', background: '#F9FAFB', borderRadius: '16px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '6px' }}>Note</div>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151', lineHeight: 1.5 }}>{transaction.note}</div>
                            </div>
                        )}

                        {/* Wallet Balances - Intelligent Display for Receipt */}
                        {(() => {
                            let balanceBefore: number | undefined;
                            let balanceAfter: number | undefined;
                            let showBalance = false;

                            // Check for new data structure (Supports both Payer & Receiver)
                            const userSnapshot = transaction.walletBalances?.[user?.uid];

                            if (userSnapshot) {
                                balanceBefore = userSnapshot.before;
                                balanceAfter = userSnapshot.after;
                                showBalance = true;
                            }
                            // Fallback logic for older transactions (Only accurate for Recorder)
                            else if ((transaction.type === 'expense' && isCurrentUserPayer) ||
                                (transaction.type === 'payment' && transaction.from === user?.uid)) {
                                balanceBefore = transaction.walletBalanceBefore;
                                balanceAfter = transaction.walletBalanceAfter;
                                showBalance = true;
                            }

                            if (!showBalance || (balanceBefore === undefined && balanceAfter === undefined)) return null;

                            return (
                                <>
                                    {balanceBefore !== undefined && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '14px 16px', background: '#F9FAFB', borderRadius: '16px',
                                            border: '1px solid #E5E7EB', marginBottom: '12px'
                                        }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>💳</div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Wallet Before</div>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{formatAmount(balanceBefore)}</div>
                                            </div>
                                        </div>
                                    )}

                                    {balanceAfter !== undefined && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '14px 16px', background: '#F0FDF4', borderRadius: '16px',
                                            border: '1px solid #BBF7D0'
                                        }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>💳</div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Wallet After</div>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{formatAmount(balanceAfter)}</div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Receipt Footer */}
                <div style={{
                    background: '#F9FAFB',
                    padding: '16px 24px',
                    borderTop: '1px solid #E5E7EB',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '9px', color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.5px' }}>
                        TXN: {transaction.id || 'N/A'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', fontWeight: 600 }}>
                        Generated by Hostel Ledger • app.hostelledger.aarx.online
                    </div>
                </div>
            </div>
        </>
    );
};

export default TransactionDetailModal;
