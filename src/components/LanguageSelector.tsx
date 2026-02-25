import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const LanguageSelector = () => {
    const { i18n, t } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 rounded-full hover:bg-[#4a6850]/10 transition-colors"
                            aria-label="Change language"
                        >
                            <Languages className="h-5 w-5 text-[#4a6850]" aria-hidden="true" />
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Change language</p>
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-32 rounded-xl shadow-lg border-[#4a6850]/10">
                <DropdownMenuItem
                    onClick={() => changeLanguage("en")}
                    className="flex items-center justify-between font-bold cursor-pointer hover:bg-[#4a6850]/5"
                    role="menuitemradio"
                    aria-checked={i18n.language === 'en'}
                >
                    <span>English</span>
                    {i18n.language === 'en' && <span className="w-2 h-2 rounded-full bg-[#4a6850]" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => changeLanguage("ur")}
                    className="flex items-center justify-between font-bold cursor-pointer hover:bg-[#4a6850]/5"
                    role="menuitemradio"
                    aria-checked={i18n.language === 'ur'}
                >
                    <span>اردو</span>
                    {i18n.language === 'ur' && <span className="w-2 h-2 rounded-full bg-[#4a6850]" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default LanguageSelector;
