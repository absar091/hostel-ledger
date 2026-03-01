import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Check, Search } from "lucide-react";
import { LANGUAGES, type Language } from "@/lib/languages";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface LanguageSelectionSheetProps {
    open: boolean;
    onClose: () => void;
    selectedLanguage: string;
    onSelect: (languageCode: string) => void;
}

const LanguageSelectionSheet = ({ open, onClose, selectedLanguage, onSelect }: LanguageSelectionSheetProps) => {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredLanguages = useMemo(() => {
        return LANGUAGES.filter(
            (l) =>
                l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                l.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                l.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 shadow-[0_-20px_60px_rgba(74,104,80,0.1)] z-[100] p-0">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                <SheetHeader className="px-6 pb-4 pt-2">
                    <SheetTitle className="text-xl font-black text-gray-900 tracking-tight">Select Language</SheetTitle>
                    <SheetDescription className="text-sm text-[#4a6850]/80 font-bold">
                        Choose your preferred language for the app interface
                    </SheetDescription>
                </SheetHeader>

                <div className="px-6 pb-4">
                    <div className="relative">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6850]/50"
                            aria-hidden="true"
                        />
                        <Input
                            aria-label="Search language"
                            placeholder="Search language..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 rounded-2xl border-[#4a6850]/20 focus:border-[#4a6850] bg-gray-50/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-8">
                    <div className="grid grid-cols-1 gap-2">
                        {filteredLanguages.map((language) => (
                            <button
                                key={language.code}
                                aria-label={`Select ${language.name}`}
                                aria-pressed={selectedLanguage === language.code}
                                onClick={() => {
                                    onSelect(language.code);
                                    onClose();
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.98]",
                                    selectedLanguage === language.code
                                        ? "bg-[#4a6850]/10 border-2 border-[#4a6850]"
                                        : "bg-white border-2 border-transparent hover:bg-gray-50"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shadow-sm">
                                        {language.flag}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-gray-900 tracking-tight">{language.name}</p>
                                        <p className="text-xs text-[#4a6850]/70 font-bold">
                                            {language.nativeName} • {language.code.toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                                {selectedLanguage === language.code && (
                                    <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default LanguageSelectionSheet;
