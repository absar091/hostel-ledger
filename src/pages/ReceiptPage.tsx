import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Share2, Download, CheckCircle2, ArrowRight, Home, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import html2canvas from "html2canvas";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import AppContainer from "@/components/AppContainer";

// Success Chime using Web Audio API for maximum reliability
const playSuccessChime = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const context = new AudioContext();
        const playNote = (frequency: number, startTime: number, duration: number, volume: number) => {
            const osc = context.createOscillator();
            const gain = context.createGain();

            osc.className = "chime-osc";
            osc.type = "sine";
            osc.frequency.setValueAtTime(frequency, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            osc.connect(gain);
            gain.connect(context.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        // A pleasant "Ding-Ding" success chime
        const now = context.currentTime;
        playNote(523.25, now, 0.5, 0.15); // C5
        playNote(659.25, now + 0.1, 0.6, 0.2); // E5
        playNote(783.99, now + 0.2, 0.8, 0.15); // G5
    } catch (e) {
        console.error("Failed to play chime", e);
    }
};

const ReceiptPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user: currentUser } = useFirebaseAuth();
    const receiptRef = useRef<HTMLDivElement>(null);

    const { transaction, type } = location.state || {};

    useEffect(() => {
        if (transaction) {
            // Play sound using Web Audio API chime
            playSuccessChime();

            // Trigger confetti
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

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
    }, [transaction]);

    if (!transaction) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
                <p className="text-slate-500 font-bold mb-4">No transaction details found</p>
                <Button onClick={() => navigate("/")} className="rounded-2xl">Go to Dashboard</Button>
            </div>
        );
    }

    const handleDownload = async () => {
        if (!receiptRef.current) return;

        try {
            toast.loading("Generating receipt...", { id: "receipt-gen" });
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                backgroundColor: "#ffffff",
                logging: false,
                useCORS: true
            });

            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `Receipt-${transaction.id.substring(0, 8)}.png`;
            link.click();

            toast.dismiss("receipt-gen");
            toast.success("Receipt downloaded!");
        } catch (err) {
            console.error("Download failed:", err);
            toast.dismiss("receipt-gen");
            toast.error("Failed to generate receipt image");
        }
    };

    const handleShare = async () => {
        if (!receiptRef.current) return;

        try {
            if (navigator.share) {
                toast.loading("Preparing to share...", { id: "share-gen" });

                try {
                    const canvas = await html2canvas(receiptRef.current, {
                        scale: 2,
                        backgroundColor: "#ffffff",
                        logging: false,
                        useCORS: true
                    });

                    canvas.toBlob(async (blob) => {
                        if (blob) {
                            const file = new File([blob], "receipt.png", { type: "image/png" });
                            const shareData = {
                                title: 'Transaction Receipt',
                                text: `Receipt for ${transaction.title || 'Transaction'}`,
                                files: [file]
                            };

                            if (navigator.canShare && navigator.canShare(shareData)) {
                                await navigator.share(shareData);
                                toast.dismiss("share-gen");
                                return;
                            }
                        }
                        throw new Error("File sharing not supported");
                    });
                } catch (fileShareErr) {
                    const shareText = `🧾 Hostel Ledger Receipt\n\n` +
                        `Title: ${transaction.title}\n` +
                        `Amount: Rs ${transaction.amount.toLocaleString()}\n` +
                        `Date: ${new Date(transaction.timestamp || transaction.date).toLocaleString()}\n` +
                        `${type === "expense" ? `Paid by: ${transaction.paidByName}` : `From: ${transaction.fromName} To: ${transaction.toName}`}\n\n` +
                        `Shared via Hostel Ledger 🚀`;

                    await navigator.share({ title: 'Transaction Receipt', text: shareText });
                    toast.dismiss("share-gen");
                }
            } else {
                toast.success("Receipt details copied to clipboard!");
            }
        } catch (err) {
            console.error('Error sharing:', err);
            toast.dismiss("share-gen");
        }
    };

    return (
        <AppContainer>
            <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center relative overflow-x-hidden">
                {/* iPhone-style Status Bar Spacer */}
                <div className="h-12 w-full lg:hidden" />

                {/* Header Container */}
                <div className="w-full max-w-2xl">
                    <header className="px-6 py-4 flex items-center justify-between z-50">
                        <button
                            onClick={() => navigate("/")}
                            className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all border border-slate-100"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-sm font-black uppercase tracking-widest text-slate-400">Transaction Receipt</h1>
                        <div className="w-10 h-10" /> {/* Spacer */}
                    </header>
                </div>

                <main className="flex-1 flex flex-col items-center px-6 pb-24 lg:pb-12 max-w-2xl mx-auto w-full">
                    {/* Success Hero */}
                    <div className="mt-2 mb-4 text-center flex flex-col items-center animate-in fade-in zoom-in duration-700">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500 shadow-[0_15px_40px_rgba(16,185,129,0.3)] flex items-center justify-center mb-4 transform rotate-3">
                            <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={3} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Success!</h2>
                        <p className="text-slate-500 font-bold text-sm">Your transaction has been recorded.</p>
                    </div>

                    {/* THE RECEIPT */}
                    <div className="w-full relative animate-in slide-in-from-bottom-12 duration-700 delay-200">
                        {/* Shadow layers for depth */}
                        <div className="absolute inset-x-4 -bottom-6 h-20 bg-slate-200/50 blur-2xl rounded-full -z-10" />

                        <div
                            ref={receiptRef}
                            className="bg-white relative p-0 overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-transform hover:scale-[1.01]"
                            style={{
                                clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 15px), 98% 100%, 96% calc(100% - 15px), 94% 100%, 92% calc(100% - 15px), 90% 100%, 88% calc(100% - 15px), 86% 100%, 84% calc(100% - 15px), 82% 100%, 80% calc(100% - 15px), 78% 100%, 76% calc(100% - 15px), 74% 100%, 72% calc(100% - 15px), 70% 100%, 68% calc(100% - 15px), 66% 100%, 64% calc(100% - 15px), 62% 100%, 60% calc(100% - 15px), 58% 100%, 56% calc(100% - 15px), 54% 100%, 52% calc(100% - 15px), 50% 100%, 48% calc(100% - 15px), 46% 100%, 44% calc(100% - 15px), 42% 100%, 40% calc(100% - 15px), 38% 100%, 36% calc(100% - 10px), 34% 100%, 32% calc(100% - 15px), 30% 100%, 28% calc(100% - 15px), 26% 100%, 24% calc(100% - 15px), 22% 100%, 20% calc(100% - 15px), 18% 100%, 16% calc(100% - 15px), 14% 100%, 12% calc(100% - 15px), 10% 100%, 8% calc(100% - 15px), 6% 100%, 4% calc(100% - 15px), 2% 100%, 0 calc(100% - 15px))"
                            }}
                        >
                            {/* Paper Texture Overlay */}
                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

                            {/* Header */}
                            <div className="pt-6 pb-4 px-6 text-center border-b border-dashed border-slate-200">
                                <div className="inline-flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center">
                                        <img src="/only-logo.png" className="w-4 h-4 filter invert" alt="L" />
                                    </div>
                                    <span className="font-black text-lg uppercase tracking-tighter text-slate-900">Hostel Ledger</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">{new Date(transaction.timestamp || transaction.date).toLocaleString()}</div>
                            </div>

                            {/* Hero Amount */}
                            <div className="py-6 text-center bg-slate-50/30">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] block mb-2">Amount {type === 'expense' ? 'Spent' : 'Received'}</span>
                                <div className="text-4xl font-black text-emerald-600 tabular-nums tracking-tighter flex justify-center items-end gap-1">
                                    <span className="text-xl mb-1 opacity-40 font-bold">Rs</span>
                                    {transaction.amount.toLocaleString()}
                                </div>
                            </div>

                            {/* Detail Rows */}
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transaction ID</p>
                                        <p className="font-mono text-[10px] font-bold text-slate-900">{transaction.id.substring(0, 16).toUpperCase()}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                                        <p className="font-black text-[10px] text-slate-900 uppercase tracking-tight">{type === 'expense' ? 'Group Expense' : 'Settlement Payment'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{type === "expense" ? "Paid By" : "From"}</p>
                                        <p className="font-black text-xs text-slate-900">{type === "expense" ? transaction.paidByName : transaction.fromName}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{type === "expense" ? "Split With" : "To"}</p>
                                        <p className="font-black text-xs text-slate-900">
                                            {type === "expense"
                                                ? `${transaction.participants?.length || 0} People`
                                                : transaction.toName || currentUser?.name}
                                        </p>
                                    </div>
                                </div>

                                {transaction.note && (
                                    <div className="pt-3 border-t border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Note</p>
                                        <div className="bg-slate-50 rounded-xl p-3 text-xs font-bold text-slate-700 italic border border-slate-100">
                                            "{transaction.note}"
                                        </div>
                                    </div>
                                )}

                                {type === "expense" && transaction.participants && (
                                    <div className="pt-4 border-t border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Breakdown</p>
                                        <div className="space-y-2">
                                            {transaction.participants.map((p: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500 font-bold">{p.name || `Member ${i + 1}`}</span>
                                                    <span className="text-slate-900 font-black">Rs {p.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Barcode & Footer - Compacted */}
                            <div className="p-6 bg-slate-900 text-white text-center pb-8">
                                <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Fully Settled • No Returns</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full mt-6 grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-6 duration-700 delay-500">
                        <Button
                            onClick={handleDownload}
                            variant="outline"
                            className="h-14 rounded-3xl bg-white border-slate-200 text-slate-900 font-black text-xs uppercase tracking-wider shadow-md hover:bg-slate-50 border-2"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>
                        <Button
                            onClick={handleShare}
                            className="h-14 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-[0_10px_20px_rgba(16,185,129,0.2)] border-0"
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                    </div>

                    <Button
                        onClick={() => navigate("/")}
                        variant="ghost"
                        className="mt-4 text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest text-[10px]"
                    >
                        <Home className="w-3.5 h-3.5 mr-1.5" />
                        Back to Dashboard
                    </Button>
                </main>
            </div>

            <style>{`
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s ease-in-out infinite;
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0) rotate(3deg); }
                    50% { transform: translateY(-8px) rotate(5deg); }
                }
            `}</style>
        </AppContainer>
    );
};

export default ReceiptPage;
