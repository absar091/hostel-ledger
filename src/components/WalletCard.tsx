import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

interface WalletCardProps {
  toReceive: number;
  toOwe: number;
  currency?: string;
  onAddMoney?: () => void;
}

const WalletCard = ({
  toReceive,
  toOwe,
  currency = "Rs",
  onAddMoney
}: WalletCardProps) => {
  const { getWalletBalance } = useFirebaseAuth();
  const walletBalance = getWalletBalance();
  
  return (
    <div className="gradient-wallet rounded-2xl p-6 shadow-wallet animate-fade-in text-muted-foreground bg-destructive-foreground">
      {/* Wallet Balance Section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-primary-foreground/80 text-sm font-medium mb-1">
            Wallet Balance
          </div>
          <div className="text-primary-foreground text-3xl font-bold">
            {currency} {walletBalance.toLocaleString()}
          </div>
        </div>
        {onAddMoney && (
          <button
            onClick={onAddMoney}
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
          >
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        )}
      </div>

      {/* Net Balance Section */}
      <div className="border-t border-primary-foreground/20 pt-4 mb-4">
        <div className="text-primary-foreground/80 text-sm font-medium mb-1">
          Net Balance (Group Settlements)
        </div>
        <div className="text-primary-foreground text-2xl font-bold">
          {toReceive - toOwe >= 0 ? "+" : ""}{currency} {Math.abs(toReceive - toOwe).toLocaleString()}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="backdrop-blur-sm rounded-xl p-4 bg-secondary-foreground">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-primary-foreground/80 text-sm">You'll Receive</span>
          </div>
          <div className="text-primary-foreground text-xl font-bold">
            {currency} {toReceive.toLocaleString()}
          </div>
        </div>
        
        <div className="backdrop-blur-sm rounded-xl p-4 bg-red-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-primary-foreground/80 text-sm">You Owe</span>
          </div>
          <div className="text-primary-foreground text-xl font-bold">
            {currency} {toOwe.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletCard;