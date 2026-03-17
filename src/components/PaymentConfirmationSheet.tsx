import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Avatar from "./Avatar";
import { CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaymentConfirmationSheetProps {
  open: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    amount?: number; // New settlement system amount
    balance?: number; // Old balance system (for backward compatibility)
    groupId?: string;
  } | null;
  onConfirmPayment: (memberId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
}

const PaymentConfirmationSheet = ({ 
  open, 
  onClose, 
  member, 
  onConfirmPayment 
}: PaymentConfirmationSheetProps) => {
  const { t } = useTranslation();

  if (!member) return null;

  // Handle both new settlement system (amount) and old balance system (balance)
  const amountToPay = member.amount || Math.abs(member.balance || 0);
  
  // Validate amount to prevent NaN
  if (isNaN(amountToPay) || amountToPay <= 0) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="max-h-[50vh] rounded-t-3xl flex flex-col bg-white border-t border-red-200 shadow-[0_-20px_60px_rgba(239,68,68,0.1)]">
          <SheetHeader className="flex-shrink-0 mb-6 pt-2">
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
            
            <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">Payment Error</SheetTitle>
            <SheetDescription className="text-center text-sm text-red-500/80 font-bold">
              Unable to process payment due to invalid amount
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_25px_70px_rgba(239,68,68,0.3)]">
                <AlertCircle className="w-8 h-8 text-white font-bold" />
              </div>
              <h3 className="text-xl font-black mb-3 text-gray-900 tracking-tight">Invalid Payment Amount</h3>
              <p className="text-red-500/80 mb-6 font-bold leading-relaxed">
                Unable to determine the payment amount for {member.name}
              </p>
              <Button 
                onClick={onClose} 
                variant="outline"
                className="h-12 px-8 rounded-3xl border-2 border-red-200 text-red-600 hover:bg-red-50 font-black shadow-lg hover:shadow-xl transition-all"
              >
                Close
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const handlePayNow = async () => {
    const result = await onConfirmPayment(member.id, amountToPay);
    if (result.success) {
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 shadow-[0_-20px_60px_rgba(74,104,80,0.1)] z-[100]">
        <SheetHeader className="flex-shrink-0 mb-6 pt-2">
          {/* Handle Bar */}
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
          
          <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">Confirm Settlement</SheetTitle>
          <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
            Confirm that you have paid this amount to {member.name}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Member Info - iPhone Style */}
          <div className="text-center mb-8">
            <Avatar name={member.name} size="lg" />
            <h3 className="text-2xl font-black mt-4 text-gray-900 tracking-tight">{member.name}</h3>
            <p className="text-[#4a6850]/80 font-bold">Settlement Amount</p>
            <div className="text-3xl font-black text-[#4a6850] mt-3 tracking-tighter tabular-nums">
              Rs {amountToPay.toLocaleString()}
            </div>
          </div>

          {/* Info Card - iPhone Style */}
          <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl p-6 border-2 border-[#4a6850]/20 shadow-lg mb-6 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <p className="text-sm font-bold text-[#4a6850]/80 leading-relaxed">
              By confirming, this amount will be deducted from your pending debt to {member.name}.
            </p>
          </div>

          {/* Payment Summary - iPhone Style */}
          <div className="bg-white rounded-3xl p-6 border border-[#4a6850]/10 shadow-sm mb-6">
            <h4 className="font-black text-gray-900 mb-4 text-lg tracking-tight uppercase">Settlement Details</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#4a6850]/80 font-bold">Recipient</span>
                <span className="font-black text-gray-900">{member.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#4a6850]/80 font-bold">Amount</span>
                <span className="font-black text-gray-900 tabular-nums">Rs {amountToPay.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                <span className="text-[#4a6850]/80 font-bold">Status</span>
                <span className="font-black text-amber-600">Pending Confirmation</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 pt-6 border-t border-[#4a6850]/10 bg-white">
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1 h-14 rounded-3xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black border-0 shadow-lg hover:shadow-xl transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayNow}
              className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all"
            >
              Confirm Payment
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PaymentConfirmationSheet;