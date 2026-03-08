import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, ChevronRight, X } from "lucide-react";
import { getAIInsights } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DialogTitle } from "@radix-ui/react-dialog";

interface AIInsights {
    summary: string;
    highlights: string[];
    advice: string;
    alerts: string[];
    chartData: any[];
}

interface AIInsightsSheetProps {
    trigger?: React.ReactNode;
}

const AIInsightsSheet = ({ trigger }: AIInsightsSheetProps) => {
    const { t } = useTranslation();
    const [insights, setInsights] = useState<AIInsights | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen || insights) return; // Only fetch when opened and if not already fetched

        const fetchInsights = async () => {
            setLoading(true);
            try {
                const response = await getAIInsights();
                if (response.success) {
                    setInsights(response.insights);
                } else {
                    setError("Failed to load insights");
                }
            } catch (err) {
                setError("AI insights unavailable");
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, [isOpen]);

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                {trigger ? (
                    trigger
                ) : (
                    <button className="flex items-center gap-2 bg-[#4a6850]/5 hover:bg-[#4a6850]/10 border border-[#4a6850]/20 rounded-full px-4 py-2 transition-colors duration-200 group">
                        <Sparkles className="w-4 h-4 text-[#4a6850] group-hover:animate-pulse" />
                        <span className="text-xs font-black text-[#4a6850] uppercase tracking-wider">AI Insights</span>
                    </button>
                )}
            </SheetTrigger>

            <SheetContent side="bottom" className="h-[85vh] sm:h-[90vh] rounded-t-[32px] p-0 flex flex-col bg-gray-50 border-t-0 shadow-2xl">
                {/* Modern Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-2 bg-white rounded-t-[32px] relative z-10 sticky top-0 border-b border-gray-100">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </div>

                <div className="flex-1 overflow-y-auto px-6 pt-4 pb-24">
                    <DialogTitle asChild>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-[#4a6850]/10 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-[#4a6850]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">AI Financial Insights</h2>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Powered by Gemini 3.1 Flash</p>
                            </div>
                        </div>
                    </DialogTitle>

                    {loading ? (
                        <div className="space-y-6 animate-pulse">
                            <div className="w-full h-32 bg-gray-200 rounded-[24px]"></div>
                            <div className="w-full h-48 bg-gray-200 rounded-[24px]"></div>
                            <div className="w-full h-24 bg-gray-200 rounded-[24px]"></div>
                        </div>
                    ) : error || !insights ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
                            <AlertCircle className="w-10 h-10 text-gray-300" />
                            <p className="text-sm font-medium text-gray-500">Failed to load insights.<br />Please try again later.</p>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Card 1: AI Summary (App Theme Green) */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-[#4a6850] to-[#364d3b] rounded-[24px] p-6 shadow-lg shadow-[#4a6850]/20 text-white flex flex-col justify-between group">
                                <Sparkles className="absolute -top-4 -right-4 w-32 h-32 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
                                <p className="relative z-10 text-sm font-medium leading-relaxed drop-shadow-sm text-emerald-50/90 h-full flex flex-col justify-center">
                                    <strong className="text-white font-black text-lg block mb-2">{insights.summary.split(',')[0].replace('Hi ', '').replace('Hi', '')},</strong>
                                    {insights.summary.includes(',') ? insights.summary.substring(insights.summary.indexOf(',') + 1).trim() : insights.summary}
                                </p>
                            </div>

                            {/* Highlights List */}
                            {insights.highlights.length > 0 && (
                                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-3">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Key Changes</h3>
                                    {insights.highlights.map((highlight, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <TrendingUp className="w-3 h-3 text-emerald-600" />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-700 leading-snug">{highlight}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Card 2: AI Insights Graph */}
                            {insights.chartData && insights.chartData.length > 0 && (
                                <div className="bg-white border border-gray-100 rounded-[24px] p-5 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                                            <h3 className="text-xs font-black text-gray-900 tracking-tight uppercase">Spending Trend</h3>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">7 Days</span>
                                    </div>
                                    <div className="w-full h-[140px] -ml-4 mt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={insights.chartData}>
                                                <defs>
                                                    <linearGradient id="colorAmount2" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="day" hide={true} />
                                                <YAxis hide={true} />
                                                <ChartTooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '11px', padding: '4px 8px' }}
                                                    labelStyle={{ display: 'none' }}
                                                    cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3' }}
                                                />
                                                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount2)" animationDuration={1000} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Card 3: Alerts (Red) */}
                            {insights.alerts.length > 0 && (
                                <div className="bg-[#fff5f2] border border-[#ffe4d6] rounded-[24px] p-6 flex flex-col justify-center gap-3 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#ffecd6] flex items-center justify-center">
                                            <AlertCircle className="w-5 h-5 text-[#e05b38]" />
                                        </div>
                                        <p className="text-[11px] font-black text-[#e05b38] uppercase tracking-wider">Action Required</p>
                                    </div>
                                    <div className="space-y-2">
                                        {insights.alerts.map((alert, i) => (
                                            <p key={i} className="text-sm font-semibold text-[#8a331a] leading-relaxed border-l-2 border-[#e05b38]/30 pl-3 py-0.5">{alert}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Card 4: Fin-Tip (Blue) */}
                            {insights.advice && (
                                <div className="bg-[#f0f7ff] border border-[#d6eaff] rounded-[24px] p-6 flex flex-col justify-center gap-3 shadow-sm mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#d6eaff] flex items-center justify-center">
                                            <Lightbulb className="w-5 h-5 text-[#2b7ee0]" />
                                        </div>
                                        <p className="text-[11px] font-black text-[#2b7ee0] uppercase tracking-wider">Fin-Tip</p>
                                    </div>
                                    <p className="text-sm font-semibold text-[#184c8a] leading-relaxed">{insights.advice}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default AIInsightsSheet;
