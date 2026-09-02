import re

with open("src/components/TransactionDetailModal.tsx", "r") as f:
    content = f.read()

# Add imports if not present
if "TooltipProvider" not in content:
    content = re.sub(
        r'(import React,.*?from "react";)',
        r'\1\nimport { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";',
        content,
        count=1
    )

# Fix Share as Image button
content = re.sub(
    r'<button\s+onClick=\{handleShareAsImage\}[\s\S]*?title="Share as Image"\s*>([\s\S]*?)</button>',
    r'''<TooltipProvider>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={handleShareAsImage}
                                            disabled={isGenerating}
                                            className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                                        >
                                            \1
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Share as Image</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>''',
    content
)

# Fix Copy Reference button
content = re.sub(
    r'<button\s+onClick=\{handleCopyId\}[\s\S]*?title=\{isCopied \? "Copied!" : "Copy Reference"\}\s*>([\s\S]*?)</button>',
    r'''<TooltipProvider>
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={handleCopyId}
                                                        className={`p-2 rounded-full transition-all ${isCopied
                                                            ? "bg-emerald-100 text-emerald-600 scale-110"
                                                            : "bg-white text-slate-400 hover:text-emerald-600 shadow-sm border border-slate-100 group-hover:border-emerald-200"
                                                            }`}
                                                    >
                                                        \1
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{isCopied ? "Copied!" : "Copy Reference"}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>''',
    content
)

with open("src/components/TransactionDetailModal.tsx", "w") as f:
    f.write(content)
