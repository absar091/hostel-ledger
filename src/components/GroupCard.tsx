import { ChevronRight, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GroupCardProps {
  name: string;
  balance: number;
  memberCount: number;
  emoji?: string;
  onClick: () => void;
}

const GroupCard = ({ name, balance, memberCount, emoji = "👥", onClick }: GroupCardProps) => {
  const isPositive = balance >= 0;
  
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="w-full bg-card rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all duration-200 flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-2xl shrink-0">
              {emoji}
            </div>
            
            <div className="flex-1 text-left">
              <div className="font-semibold text-foreground">{name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                {memberCount} members
              </div>
            </div>
            
            <div className="text-right">
              <div className={`font-bold ${isPositive ? "text-positive" : "text-negative"}`}>
                {isPositive ? "+" : ""}Rs {Math.abs(balance).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {isPositive ? "you'll receive" : "you owe"}
              </div>
            </div>
            
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800 max-w-xs">
          <p>Tap to view group details, expenses, and member balances</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default GroupCard;
