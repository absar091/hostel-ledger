import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Check, Search } from "lucide-react";
import { CURRENCIES, type Currency } from "@/lib/currency";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface CurrencySelectionSheetProps {
    open: boolean;
    onClose: () => void;
    selectedCurrency: string;
    onSelect: (currencyCode: string) => void;
}

const CurrencySelectionSheet = ({ open, onClose, selectedCurrency, onSelect }: CurrencySelectionSheetProps) => {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCurrencies = useMemo(() => {
        return CURRENCIES.filter(
            (c) =>
                c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 shadow-[0_-20px_60px_rgba(74,104,80,0.1)] z-[100] p-0">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                <SheetHeader className="px-6 pb-4 pt-2">
                    <SheetTitle className="text-xl font-black text-gray-900 tracking-tight">Select Currency</SheetTitle>
                    <SheetDescription className="text-sm text-[#4a6850]/80 font-bold">
                        Choose your preferred currency for display and transactions
                    </SheetDescription>
                </SheetHeader>

                <div className="px-6 pb-4">
                    <div className="relative">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6850]/50"
                            aria-hidden="true"
                        />
                        <Input
                            aria-label="Search currency"
                            placeholder="Search currency..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 rounded-2xl border-[#4a6850]/20 focus:border-[#4a6850] bg-gray-50/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-8">
                    <div className="grid grid-cols-1 gap-2">
                        {filteredCurrencies.map((currency) => (
                            <button
                                key={currency.code}
                                onClick={() => {
                                    onSelect(currency.code);
                                    onClose();
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.98]",
                                    selectedCurrency === currency.code
                                        ? "bg-[#4a6850]/10 border-2 border-[#4a6850]"
                                        : "bg-white border-2 border-transparent hover:bg-gray-50"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shadow-sm">
                                        {currency.flag}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-gray-900 tracking-tight">{currency.name}</p>
                                        <p className="text-xs text-[#4a6850]/70 font-bold uppercase tracking-wider">
                                            {currency.code} • {currency.symbol}
                                        </p>
                                    </div>
                                </div>
                                {selectedCurrency === currency.code && (
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

export default CurrencySelectionSheet;
