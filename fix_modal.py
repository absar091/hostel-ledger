import re

with open("src/components/TransactionDetailModal.tsx", "r") as f:
    content = f.read()

# Add imports
import_str = 'import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";\n'
if "TooltipProvider" not in content:
    content = content.replace('import { toast } from "sonner";', f'import {{ toast }} from "sonner";\n{import_str}')

# Share and Close buttons in Header
share_search = r"""                            <button
                                onClick={handleShareAsImage}
                                disabled={isGenerating}
                                className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                                title="Share as Image"
                            >
                                {isGenerating ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Image className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" />
                                )}
                            </button>"""

share_replace = r"""                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={handleShareAsImage}
                                            disabled={isGenerating}
                                            className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                                            aria-label="Share transaction as image"
                                        >
                                            {isGenerating ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Image className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Share as Image</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>"""

content = content.replace(share_search, share_replace)

close_search = r"""                            <button
                                onClick={onClose}
                                className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                            >
                                <X className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" strokeWidth={3} />
                            </button>"""

close_replace = r"""                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={onClose}
                                            className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                                            aria-label="Close transaction details"
                                        >
                                            <X className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" strokeWidth={3} />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Close</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>"""

content = content.replace(close_search, close_replace)

copy_search = r"""                                        <button
                                            onClick={handleCopyId}
                                            className={`p-2 rounded-full transition-all ${isCopied
                                                ? "bg-emerald-100 text-emerald-600 scale-110"
                                                : "bg-white text-slate-400 hover:text-emerald-600 shadow-sm border border-slate-100 group-hover:border-emerald-200"
                                                }`}
                                            title={isCopied ? "Copied!" : "Copy Reference"}
                                        >
                                            {isCopied ? (
                                                <Check className="w-3.5 h-3.5" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>"""

copy_replace = r"""                                        <TooltipProvider>
                                            <Tooltip open={isCopied ? true : undefined}>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={handleCopyId}
                                                        className={`p-2 rounded-full transition-all ${isCopied
                                                            ? "bg-emerald-100 text-emerald-600 scale-110"
                                                            : "bg-white text-slate-400 hover:text-emerald-600 shadow-sm border border-slate-100 group-hover:border-emerald-200"
                                                            }`}
                                                        aria-label={isCopied ? "Reference copied" : "Copy transaction reference"}
                                                    >
                                                        {isCopied ? (
                                                            <Check className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{isCopied ? "Copied!" : "Copy Reference"}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>"""

content = content.replace(copy_search, copy_replace)

with open("src/components/TransactionDetailModal.tsx", "w") as f:
    f.write(content)

print("Modifications applied successfully.")
