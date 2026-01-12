import { ArrowDownLeft, ArrowUpRight, Plus, Info } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import FinancialInfoDialog from "./FinancialInfoDialog";

interface WalletCardProps {
  toReceive: number;
  toOwe: number;
  currency?: string;
  onAddMoney?: () => void;
}

const WalletCard = ({
  currency = "Rs",
  onAddMoney
}: {
  currency?: string;
  onAddMoney?: () => void;
}) => {
  const { getWalletBalance, getTotalToReceive, getTotalToPay, getSettlementDelta } = useFirebaseAuth();
  
  const availableBudget = getWalletBalance();
  const totalToReceive = getTotalToReceive();
  const totalToPay = getTotalToPay();
  const settlementDelta = getSettlementDelta();
  
  return (
    <div className="wallet-card mobile-margin mb-6">
      {/* Available Budget Section - Mobile Optimized */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="text-white/80 text-sm font-medium mb-1 flex items-center gap-2">
            Available Budget
            <FinancialInfoDialog type="availableBudget">
              <Info className="w-3 h-3 opacity-60 cursor-pointer hover:opacity-100 transition-opacity" />
            </FinancialInfoDialog>
          </div>
          <div className="text-white text-currency-large mb-1">
            {currency} {(availableBudget || 0).toLocaleString()}
          </div>
          <div className="text-white/60 text-xs">
            Ready to spend
          </div>
        </div>
        {onAddMoney && (
          <button
            onClick={onAddMoney}
            className="touch-target w-12 h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Settlement Delta Section - Mobile Optimized */}
      <div className="border-t border-white/20 pt-4 mb-4">
        <div className="text-white/80 text-sm font-medium mb-1 flex items-center gap-2">
          Settlement Delta
          <FinancialInfoDialog type="settlementDelta">
            <Info className="w-3 h-3 opacity-60 cursor-pointer hover:opacity-100 transition-opacity" />
          </FinancialInfoDialog>
        </div>
        <div className={`text-currency-medium mb-1 ${
          settlementDelta > 0 ? 'text-emerald-300' : 
          settlementDelta < 0 ? 'text-red-300' : 
          'text-white'
        }`}>
          {settlementDelta > 0 ? '+' : ''}{currency} {(settlementDelta || 0).toLocaleString()}
        </div>
        <div className="text-white/60 text-xs">
          Pending group settlements
        </div>
      </div>
      
      {/* Settlement Details - Mobile Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass-card p-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
              You'll Receive
              <FinancialInfoDialog type="youllReceive">
                <Info className="w-3 h-3 opacity-60 cursor-pointer hover:opacity-100 transition-opacity" />
              </FinancialInfoDialog>
            </span>
          </div>
          <div className="text-emerald-400 text-currency-small mb-1">
            {currency} {(totalToReceive || 0).toLocaleString()}
          </div>
          <div className="text-emerald-400/70 text-xs">
            Money others owe you
          </div>
        </div>
        
        <div className="glass-card p-4 bg-red-500/10 border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-red-400 text-sm font-medium flex items-center gap-1">
              You Owe
              <FinancialInfoDialog type="youOwe">
                <Info className="w-3 h-3 opacity-60 cursor-pointer hover:opacity-100 transition-opacity" />
              </FinancialInfoDialog>
            </span>
          </div>
          <div className="text-red-400 text-currency-small mb-1">
            {currency} {(totalToPay || 0).toLocaleString()}
          </div>
          <div className="text-red-400/70 text-xs">
            Money you need to pay
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletCard;