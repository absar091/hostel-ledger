import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import FinancialInfoDialog from "./FinancialInfoDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const { getWalletBalance } = useFirebaseAuth();
  const { getTotalToReceive, getTotalToPay, getSettlementDelta } = useFirebaseData();
  
  const availableBudget = getWalletBalance();
  const totalToReceive = getTotalToReceive();
  const totalToPay = getTotalToPay();
  const settlementDelta = getSettlementDelta();
  
  return (
    <div className="wallet-card mobile-margin mb-6">
      {/* Available Budget Section - Mobile Optimized */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <Tooltip>
            <TooltipTrigger asChild>
                <div className="text-white/80 text-sm font-medium mb-1 flex items-center gap-2 cursor-help">
                  Available Budget
                  <FinancialInfoDialog type="availableBudget">
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-xs">?</span>
                  </FinancialInfoDialog>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800 max-w-xs">
                <p>Your current wallet balance that you can spend. Add money to increase this amount.</p>
              </TooltipContent>
            </Tooltip>
            <div className="text-white text-currency-large mb-1">
              {currency} {(availableBudget || 0).toLocaleString()}
            </div>
            <div className="text-white/60 text-xs">
              Ready to spend
            </div>
          </div>
          {onAddMoney && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onAddMoney}
                  className="touch-target w-12 h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  <Plus className="w-6 h-6 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-gray-900 text-white border-gray-800">
                <p>Add money to your wallet</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Settlement Delta Section - Mobile Optimized */}
        <div className="border-t border-white/20 pt-4 mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-white/80 text-sm font-medium mb-1 flex items-center gap-2 cursor-help">
                Settlement Delta
                <FinancialInfoDialog type="settlementDelta">
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-xs">?</span>
                </FinancialInfoDialog>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800 max-w-xs">
              <p>Net balance from group expenses. Positive means others owe you money, negative means you owe others.</p>
            </TooltipContent>
          </Tooltip>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="glass-card p-4 bg-emerald-500/10 border-emerald-500/20 cursor-help">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
                    You'll Receive
                    <FinancialInfoDialog type="youllReceive">
                      <span className="w-3 h-3 rounded-full bg-emerald-500/30 flex items-center justify-center text-[8px]">?</span>
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
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800 max-w-xs">
              <p>Total amount that group members owe you from shared expenses you paid for</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="glass-card p-4 bg-red-500/10 border-red-500/20 cursor-help">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-red-400 text-sm font-medium flex items-center gap-1">
                    You Owe
                    <FinancialInfoDialog type="youOwe">
                      <span className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center text-[8px]">?</span>
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
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800 max-w-xs">
              <p>Total amount you owe to group members from shared expenses they paid for</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default WalletCard;