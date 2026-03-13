import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import GroupChat from "./GroupChat";
import { MessageSquareText } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ExpenseThreadSheetProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupName: string;
    expenseId: string;
    expenseTitle: string;
}

const ExpenseThreadSheet = ({
    isOpen,
    onClose,
    groupId,
    groupName,
    expenseId,
    expenseTitle
}: ExpenseThreadSheetProps) => {
    const { t } = useTranslation();

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" className="h-[92vh] sm:h-[85vh] p-0 border-0 rounded-t-[32px] overflow-hidden sm:max-w-none flex flex-col">
                <SheetHeader className="p-4 border-b bg-white border-[#4a6850]/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center shadow-lg">
                            <MessageSquareText className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                            <SheetTitle className="text-base font-black truncate max-w-[200px] text-gray-900">
                                {expenseTitle}
                            </SheetTitle>
                            <p className="text-[10px] font-bold text-[#4a6850]/60 uppercase tracking-widest leading-none mt-0.5">
                                {t("chat.discussion_title", "Expense Discussion")}
                            </p>
                        </div>
                    </div>
                </SheetHeader>
                <div className="flex-1 min-h-0 bg-white">
                    <GroupChat
                        groupId={groupId}
                        groupName={groupName}
                        expenseId={expenseId}
                        fullHeight={true}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default ExpenseThreadSheet;
