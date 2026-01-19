import { Plus, HandCoins, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickActionsProps {
  onAddExpense: () => void;
  onReceivedMoney: () => void;
  onNewGroup: () => void;
}

const QuickActions = ({ onAddExpense, onReceivedMoney, onNewGroup }: QuickActionsProps) => {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onAddExpense}
              className="flex flex-col items-center gap-2 h-auto py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-card"
            >
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">Add Expense</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
            <p>Record a shared expense and split it among group members</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onReceivedMoney}
              variant="secondary"
              className="flex flex-col items-center gap-2 h-auto py-4 rounded-xl shadow-card"
            >
              <div className="w-10 h-10 rounded-full bg-positive/10 flex items-center justify-center">
                <HandCoins className="w-5 h-5 text-positive" />
              </div>
              <span className="text-sm font-medium text-foreground">Received</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
            <p>Record money received from a group member to settle their debt</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onNewGroup}
              variant="secondary"
              className="flex flex-col items-center gap-2 h-auto py-4 rounded-xl shadow-card"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm font-medium text-foreground">New Group</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-800">
            <p>Create a new group for splitting expenses with friends or family</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default QuickActions;
