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
  
  const availableBudget = getWalletBalance();     // Real money only
  const totalToReceive = getTotalToReceive();    // Money others owe you
  const totalToPay = getTotalToPay();           // Money you owe others
  const settlementDelta = getSettlementDelta(); // Calculated expectation
  
  return (
    <div className="gradient-wallet rounded-2xl p-6 shadow-wallet animate-fade-in text-muted-foreground bg-destructive-foreground">
      {/* Available Budget Section - Most Prominent */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-primary-foreground/80 text-sm font-medium mb-1 flex items-center gap-2">
            🏦 Available Budget
            <FinancialInfoDialog type="availableBudget">
              <Info className="w-3 h-3 opacity-60 cursor-pointer hover:opacity-100 transition-opacity" />
            </FinancialInfoDialog>
          </div>
          <div className="text-primary-foreground text-4xl font-bold mb-1">
            {currency} {availableBudget.toLocaleString()}
          </div>
          <div className="text-primary-foreground/60 text-xs">
            Actual money you have right now
          </div>
        </div>
        {onAddMoney && (
          <button
            onClick={onAddMoney}
            className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
          >
            <Plus className="w-6 h-6 text-primary-foreground" />
          </button>
        )}
      </div>

      {/* Settlement Delta Section */}
      <div className="border-t border-primary-foreground/20 pt-4 mb-4">
        <div className="text-primary-foreground/80 text-sm font-medium mb-1 flex items-center gap-2">
          🔄 Settlement Delta
          <FinancialInfoDialog type="settlementDelta">
            <Info className="w-3 h-3 opacity-60 cursor-pointer hover:opacity-100 transition-opacity" />
          </FinancialInfoDialog>
        </div>
        <div className={`text-2xl font-bold mb-1 ${
          settlementDelta > 0 ? 'text-green-400' : 
          settlementDelta < 0 ? 'text-red-400' : 
          'text-primary-foreground'
        }`}>
          {settlementDelta > 0 ? '+' : ''}{currency} {settlementDelta.toLocaleString()}
        </div>
        <div className="text-primary-foreground/60 text-xs">
          Pending group settlements
        </div>
      </div>
      
      {/* Settlement Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="backdrop-blur-sm rounded-xl p-4 bg-green-600/20 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-green-400 text-sm font-medium flex items-center gap-1">
              📥 You'll Receive
              <FinancialInfoDialog type="youllReceive">
                <Info className="w-3 h-3 opacity-60 cursor-pointer hover:opacity-100 transition-opacity" />
              </FinancialInfoDialog>
            </span>
          </div>
          <div className="text-green-400 text-xl font-bold mb-1">
            {currency} {totalToReceive.toLocaleString()}
          </div>
          <div className="text-green-400/70 text-xs">
            Money others owe you
          </div>
        </div>
        
        <div className="backdrop-blur-sm rounded-xl p-4 bg-red-600/20 border border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-red-400 text-sm font-medium flex items-center gap-1">
              📤 You Owe
              <FinancialInfoDialog type="youOwe">
                <Info className="w-3 h-3 opacity-60 cursor-pointer hover:opacity-100 transition-opacity" />
              </FinancialInfoDialog>
            </span>
          </div>
          <div className="text-red-400 text-xl font-bold mb-1">
            {currency} {totalToPay.toLocaleString()}
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