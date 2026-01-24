import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Check, Share2, Download, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface TransactionSuccessSheetProps {
    open: boolean;
    onClose: () => void;
    transaction: any;
    type: "expense" | "payment";
}

const TransactionSuccessSheet = ({ open, onClose, transaction, type }: TransactionSuccessSheetProps) => {
    useEffect(() => {
        if (open) {
            // Trigger confetti
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [open]);

    if (!transaction) return null;

    const handleShare = async () => {
        if (navigator.share) {
            try {
                const shareText = `🧾 Hostel Ledger Receipt\n\n` +
                    `Title: ${transaction.title}\n` +
                    `Amount: Rs ${transaction.amount.toLocaleString()}\n` +
                    `Date: ${transaction.date}\n` +
                    `${type === "expense" ? `Paid by: ${transaction.paidByName}` : `From: ${transaction.fromName} To: ${transaction.toName}`}\n\n` +
                    `Shared via Hostel Ledger 🚀`;

                await navigator.share({
                    title: 'Transaction Receipt',
                    text: shareText,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            // Fallback: Copy to clipboard
            const shareText = `🧾 Hostel Ledger Receipt\n\n` +
                `Title: ${transaction.title}\n` +
                `Amount: Rs ${transaction.amount.toLocaleString()}\n` +
                `Date: ${transaction.date}\n` +
                `${type === "expense" ? `Paid by: ${transaction.paidByName}` : `From: ${transaction.fromName} To: ${transaction.toName}`}\n\n` +
                `Shared via Hostel Ledger 🚀`;

            navigator.clipboard.writeText(shareText);
            alert("Receipt copied to clipboard!");
        }
    };

    return (
        <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
            <SheetContent side="bottom" className="h-[90vh] sm:h-[80vh] rounded-t-[40px] p-0 overflow-hidden bg-slate-50 border-none outline-none z-[120]">
                <SheetTitle className="sr-only">Transaction Success Receipt</SheetTitle>
                <div className="relative h-full flex flex-col p-6 animate-in fade-in slide-in-from-bottom-10 duration-500">
                    {/* Top Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-200/50 flex items-center justify-center hover:bg-slate-200 transition-colors z-10"
                    >
                        <X className="w-5 h-5 text-slate-600" />
                    </button>

                    {/* Success Header */}
                    <div className="flex flex-col items-center mt-8 mb-8">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4 animate-bounce-subtle">
                            <CheckCircle2 className="w-12 h-12 text-emerald-600" strokeWidth={3} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Transaction Successful!</h2>
                        <p className="text-slate-500 font-bold">Your transaction has been recorded.</p>
                    </div>

                    {/* Receipt Card */}
                    <div className="flex-1 overflow-y-auto pb-6">
                        <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col overflow-hidden">
                            {/* Receipt Header */}
                            <div className="p-8 pb-4 text-center">
                                <div className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">{type} Receipt</div>
                                <div className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter">
                                    Rs {transaction.amount.toLocaleString()}
                                </div>
                            </div>

                            {/* Dashed Separator */}
                            <div className="relative px-8 py-2">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-slate-50 rounded-r-full border-r border-slate-100"></div>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-slate-50 rounded-l-full border-l border-slate-100"></div>
                                <div className="w-full border-t-2 border-dashed border-slate-100"></div>
                            </div>

                            {/* Receipt Body */}
                            <div className="p-8 pt-4 space-y-5">
                                <div className="flex justify-between items-center gap-4 text-sm">
                                    <span className="text-slate-400 font-bold">Reference</span>
                                    <span className="text-slate-900 font-black truncate max-w-[150px] font-mono">{transaction.id.substring(0, 12).toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between items-center gap-4 text-sm">
                                    <span className="text-slate-400 font-bold">Date</span>
                                    <span className="text-slate-900 font-black">{transaction.date}</span>
                                </div>
                                <div className="flex justify-between items-center gap-4 text-sm">
                                    <span className="text-slate-400 font-bold">Category</span>
                                    <span className="text-slate-900 font-black uppercase tracking-wide">{type === 'expense' ? 'Expense Split' : 'Debt Settlement'}</span>
                                </div>

                                {type === "expense" ? (
                                    <>
                                        <div className="flex justify-between items-center gap-4 text-sm">
                                            <span className="text-slate-400 font-bold">Paid By</span>
                                            <span className="text-slate-900 font-black">{transaction.paidByName}</span>
                                        </div>
                                        {transaction.participants && (
                                            <div className="pt-2">
                                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest block mb-3">Participants</span>
                                                <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                                    {transaction.participants.map((p: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-600 font-bold">{p.name} {p.isTemporary && <span className="ml-1 text-[10px] text-orange-500 font-black">TEMP</span>}</span>
                                                            <span className="text-slate-900 font-black">Rs {p.amount.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center gap-4 text-sm">
                                            <span className="text-slate-400 font-bold">From</span>
                                            <span className="text-slate-900 font-black">{transaction.fromName}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-4 text-sm">
                                            <span className="text-slate-400 font-bold">To</span>
                                            <span className="text-slate-900 font-black">{transaction.toName}</span>
                                        </div>
                                    </>
                                )}

                                {transaction.note && (
                                    <div className="pt-2">
                                        <span className="text-slate-400 font-bold text-xs uppercase tracking-widest block mb-2">Note</span>
                                        <div className="p-4 bg-slate-50 rounded-2xl text-sm italic text-slate-600 font-medium">
                                            "{transaction.note}"
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-auto pt-6 flex gap-3">
                        <Button
                            onClick={handleShare}
                            variant="outline"
                            className="flex-1 h-16 rounded-3xl border-slate-200 text-slate-700 font-black shadow-lg hover:bg-slate-50 active:scale-95 transition-all flex flex-col gap-0.5"
                        >
                            <Share2 className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Share Receipt</span>
                        </Button>
                        <Button
                            onClick={onClose}
                            className="flex-[2] h-16 rounded-3xl bg-slate-900 text-white font-black shadow-xl hover:bg-slate-800 active:scale-95 transition-all text-lg"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            </SheetContent>
            <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
        </Sheet>
    );
};

export default TransactionSuccessSheet;
