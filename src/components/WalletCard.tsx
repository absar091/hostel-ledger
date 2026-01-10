import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface WalletCardProps {
  toReceive: number;
  toOwe: number;
  currency?: string;
}

const WalletCard = ({ toReceive, toOwe, currency = "Rs" }: WalletCardProps) => {
  const netBalance = toReceive - toOwe;
  
  return (
    <div className="gradient-wallet rounded-2xl p-6 shadow-wallet animate-fade-in">
      <div className="text-primary-foreground/80 text-sm font-medium mb-1">
        Your Balance
      </div>
      <div className="text-primary-foreground text-4xl font-bold mb-6">
        {netBalance >= 0 ? "+" : ""}{currency} {Math.abs(netBalance).toLocaleString()}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary-foreground/15 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-primary-foreground/80 text-sm">You'll Receive</span>
          </div>
          <div className="text-primary-foreground text-2xl font-bold">
            {currency} {toReceive.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-primary-foreground/15 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-primary-foreground/80 text-sm">You Owe</span>
          </div>
          <div className="text-primary-foreground text-2xl font-bold">
            {currency} {toOwe.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletCard;
