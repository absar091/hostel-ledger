import re

with open('src/components/TransactionDetailModal.tsx', 'r') as f:
    content = f.read()

# Replace custom Tooltip import with Radix Tooltip import
search_import = 'import Tooltip from "./Tooltip";'
replace_import = 'import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";\nimport { useTranslation } from "react-i18next";'

if search_import in content:
    content = content.replace(search_import, replace_import)
else:
    # If not there, just add it below lucide-react
    content = re.sub(
        r'(import.*?from "lucide-react";)',
        r'\1\nimport { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";\nimport { useTranslation } from "react-i18next";',
        content,
        count=1
    )

# Add useTranslation hook
search_hook = '    const { formatAmount } = useCurrency();'
replace_hook = '    const { t } = useTranslation();\n    const { formatAmount } = useCurrency();'

if 'const { t } = useTranslation();' not in content:
    content = content.replace(search_hook, replace_hook)


search_str1 = """                            {/* Share as Image button */}
                            <button
                                onClick={handleShareAsImage}
                                disabled={isGenerating}
                                className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                                title="Share as Image"
                            >"""

replace_str1 = """                            {/* Share as Image button */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={handleShareAsImage}
                                        disabled={isGenerating}
                                        className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-blue-500 hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                                        aria-label={t('common.share_as_image', 'Share as Image')}
                                    >"""

search_str2 = """                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Image className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" />
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                            >
                                <X className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" strokeWidth={3} />
                            </button>"""

replace_str2 = """                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Image className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" />
                                    )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
                                    <p>{t('common.share_as_image', 'Share as Image')}</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onClose}
                                        className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-gray-900 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                                        aria-label={t('common.close', 'Close')}
                                    >
                                        <X className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" strokeWidth={3} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
                                    <p>{t('common.close', 'Close')}</p>
                                </TooltipContent>
                            </Tooltip>"""

search_str3 = """                                        <button
                                            onClick={handleCopyId}
                                            className={`p-2 rounded-full transition-all ${isCopied
                                                ? "bg-emerald-100 text-emerald-600 scale-110"
                                                : "bg-white text-slate-400 hover:text-emerald-600 shadow-sm border border-slate-100 group-hover:border-emerald-200"
                                                }`}
                                            title={isCopied ? "Copied!" : "Copy Reference"}
                                        >"""

replace_str3 = """                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={handleCopyId}
                                                    className={`p-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${isCopied
                                                        ? "bg-emerald-100 text-emerald-600 scale-110"
                                                        : "bg-white text-slate-400 hover:text-emerald-600 shadow-sm border border-slate-100 group-hover:border-emerald-200"
                                                        }`}
                                                    aria-label={isCopied ? t('common.copied', 'Copied!') : t('common.copy_reference', 'Copy Reference')}
                                                >"""

search_str4 = """                                            {isCopied ? (
                                                <Check className="w-3.5 h-3.5" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>"""

replace_str4 = """                                                    {isCopied ? (
                                                        <Check className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800">
                                                <p>{isCopied ? t('common.copied', 'Copied!') : t('common.copy_reference', 'Copy Reference')}</p>
                                            </TooltipContent>
                                        </Tooltip>"""

search_str5 = """                                                    <button
                                                        onClick={() => {
                                                            const url = `https://www.google.com/maps/search/?api=1&query=${transaction.location?.lat},${transaction.location?.lng}`;
                                                            window.open(url, '_blank');
                                                        }}
                                                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-black uppercase tracking-wider hover:underline w-fit"
                                                    >
                                                        View on Maps <ArrowUpRight className="w-3 h-3" />
                                                    </button>"""

replace_str5 = """                                                    <button
                                                        onClick={() => {
                                                            const url = `https://www.google.com/maps/search/?api=1&query=${transaction.location?.lat},${transaction.location?.lng}`;
                                                            window.open(url, '_blank');
                                                        }}
                                                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-black uppercase tracking-wider hover:underline w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-sm"
                                                    >
                                                        View on Maps <ArrowUpRight className="w-3 h-3" />
                                                    </button>"""

search_str6 = """                                {/* Phase 2: Discuss Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowChat(true);
                                    }}
                                    className="w-full flex items-center justify-between p-4 lg:p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl lg:rounded-3xl border border-blue-200 shadow-lg group hover:from-blue-100 hover:to-blue-200 transition-all active:scale-[0.98]"
                                >"""

replace_str6 = """                                {/* Phase 2: Discuss Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowChat(true);
                                    }}
                                    className="w-full flex items-center justify-between p-4 lg:p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl lg:rounded-3xl border border-blue-200 shadow-lg group hover:from-blue-100 hover:to-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all active:scale-[0.98]"
                                >"""

search_str7 = """                    {/* Fixed footer with close button - iPhone Style */}
                    <div className="p-6 border-t border-[#4a6850]/10 bg-white flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all"
                        >
                            Close
                        </button>
                    </div>"""

replace_str7 = """                    {/* Fixed footer with close button - iPhone Style */}
                    <div className="p-6 border-t border-[#4a6850]/10 bg-white flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-2 transition-all"
                        >
                            Close
                        </button>
                    </div>"""

# Ensure entire component is wrapped in TooltipProvider
# The component starts returning at `        <>` and ends at `        </>`
# Note that TransactionDetailModal is already returning a Fragment `<>`
search_fragment = '        <>\n            <div className={`fixed inset-0 bg-black/60'
replace_fragment = '        <TooltipProvider>\n            <div className={`fixed inset-0 bg-black/60'

search_fragment_end = '            )}\n\n        </>'
replace_fragment_end = '            )}\n\n        </TooltipProvider>'

content = content.replace(search_str1, replace_str1)
content = content.replace(search_str2, replace_str2)
content = content.replace(search_str3, replace_str3)
content = content.replace(search_str4, replace_str4)
content = content.replace(search_str5, replace_str5)
content = content.replace(search_str6, replace_str6)
content = content.replace(search_str7, replace_str7)

content = content.replace(search_fragment, replace_fragment)
content = content.replace(search_fragment_end, replace_fragment_end)


with open('src/components/TransactionDetailModal.tsx', 'w') as f:
    f.write(content)
print("Patched successfully")
