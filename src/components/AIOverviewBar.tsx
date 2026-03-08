import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { getAIInsights } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface AIInsights {
    summary: string;
    highlights: string[];
    advice: string;
    alerts: string[];
    chartData: any[];
}

const AIOverviewBar = () => {
    const { t } = useTranslation();
    const [insights, setInsights] = useState<AIInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInsights = async () => {
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
    }, []);

    if (loading) {
        return (
            <div className="w-full bg-[#4a6850]/5 border border-[#4a6850]/10 rounded-3xl p-4 animate-pulse flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-[#4a6850]/20 rounded-2xl"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#4a6850]/20 rounded w-3/4"></div>
                    <div className="h-3 bg-[#4a6850]/20 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (error || !insights) return null;

    return (
        <div className="animate-in fade-in slide-in-from-top-4 duration-700 mb-8 mt-4">

            {/* Section Header */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#4a6850]" />
                    <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">AI Financial Insights</h2>
                </div>
                <div className="flex items-center gap-1.5 animate-pulse bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Swipe</span>
                    <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </div>
            </div>

            {/* Highlights Tape / Marquee (Full width) */}
            <div className="w-full overflow-hidden inline-flex group bg-[#4a6850]/5 backdrop-blur-sm border border-[#4a6850]/10 rounded-[20px] py-2.5 mb-4">
                <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
                    {insights.highlights.map((highlight, i) => (
                        <div key={i} className="flex items-center gap-2 px-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[13px] font-black text-[#4a6850]">{highlight}</span>
                            <span className="mx-4 text-[#4a6850]/20">|</span>
                        </div>
                    ))}
                    {/* Duplicate for seamless loop */}
                    {insights.highlights.map((highlight, i) => (
                        <div key={`dup-${i}`} className="flex items-center gap-2 px-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[13px] font-black text-[#4a6850]">{highlight}</span>
                            <span className="mx-4 text-[#4a6850]/20">|</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Horizontal Scroll Area - Removed hide-scrollbar so users can see they can scroll */}
            <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-4 pt-1" style={{ scrollbarWidth: 'thin' }}>

                {/* Card 1: AI Summary (App Theme Green) */}
                <div className="min-w-[85vw] sm:min-w-[320px] snap-center shrink-0 relative overflow-hidden bg-[#4a6850] rounded-[24px] p-6 shadow-lg shadow-[#4a6850]/20 text-white flex flex-col justify-between">
                    <Sparkles className="absolute -top-4 -right-4 w-28 h-28 text-white/10 rotate-12" />
                    <div className="relative z-10 flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-[10px] bg-white/20 backdrop-blur-md flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-emerald-100" />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/90">AI Assistant</h3>
                    </div>
                    <p className="relative z-10 text-sm font-medium leading-relaxed drop-shadow-sm text-emerald-50/90">
                        <strong className="text-white font-bold block mb-1">Hi {insights.summary.split(',')[0].replace('Hi ', '').replace('Hi', '')},</strong>
                        {insights.summary.includes(',') ? insights.summary.substring(insights.summary.indexOf(',') + 1).trim() : insights.summary}
                    </p>
                </div>

                {/* Card 2: AI Insights Graph */}
                {insights.chartData && insights.chartData.length > 0 && (
                    <div className="min-w-[85vw] sm:min-w-[320px] snap-center shrink-0 bg-white border border-gray-100 rounded-[24px] p-5 shadow-sm shadow-gray-200/50 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                <h3 className="text-xs font-black text-gray-900 tracking-tight">Spending Trend</h3>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">7 Days</span>
                        </div>
                        <div className="flex-1 w-full min-h-[90px] -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={insights.chartData}>
                                    <defs>
                                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="day" hide={true} />
                                    <YAxis hide={true} />
                                    <ChartTooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 44px 15px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '11px', padding: '4px 8px' }}
                                        labelStyle={{ display: 'none' }}
                                        cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Card 3: Alerts (Red) */}
                {insights.alerts.length > 0 && (
                    <div className="min-w-[80vw] sm:min-w-[280px] snap-center shrink-0 bg-[#fff5f2] border border-[#ffe4d6] rounded-[24px] p-6 flex flex-col justify-center gap-3 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#ffecd6] flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-[#e05b38]" />
                            </div>
                            <p className="text-[10px] font-black text-[#e05b38] uppercase tracking-wider">Action Required</p>
                        </div>
                        <p className="text-xs font-semibold text-[#8a331a] leading-relaxed">{insights.alerts[0]}</p>
                    </div>
                )}

                {/* Card 4: Fin-Tip (Blue) */}
                {insights.advice && (
                    <div className="min-w-[80vw] sm:min-w-[280px] snap-center shrink-0 bg-[#f0f7ff] border border-[#d6eaff] rounded-[24px] p-6 flex flex-col justify-center gap-3 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#d6eaff] flex items-center justify-center">
                                <Lightbulb className="w-4 h-4 text-[#2b7ee0]" />
                            </div>
                            <p className="text-[10px] font-black text-[#2b7ee0] uppercase tracking-wider">Fin-Tip</p>
                        </div>
                        <p className="text-xs font-semibold text-[#184c8a] leading-relaxed">{insights.advice}</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AIOverviewBar;
