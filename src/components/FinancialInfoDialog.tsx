import { Info, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/CurrencyContext";

interface FinancialInfoDialogProps {
  type: "availableBudget" | "settlementDelta" | "youllReceive" | "youOwe";
  children: React.ReactNode;
}

const FinancialInfoDialog = ({ type, children }: FinancialInfoDialogProps) => {
  const { symbol } = useCurrency();
  const getContent = () => {
    switch (type) {
      case "availableBudget":
        return {
          title: "🏦 Available Budget",
          description: "This is your real money - actual cash in your wallet, bank account, or pocket.",
          details: [
            "✅ Changes only when you actually pay or receive money",
            "✅ Decreases when you pay for expenses (full amount)",
            "✅ Increases when you add money or receive payments",
            "❌ Never changes just because an expense is created by others"
          ],
          example: `If you have ${symbol} 10,000 and pay ${symbol} 600 for chai, your Available Budget becomes ${symbol} 9,400.`
        };

      case "settlementDelta":
        return {
          title: "🔄 Settlement Delta",
          description: "This shows the pending impact of all your group expenses - it's an expectation, not actual money.",
          details: [
            "🟢 Positive (+): Others owe you money overall",
            "🔴 Negative (−): You owe money to others overall",
            "⚪ Zero (0): All expenses are settled",
            "📊 Calculated as: You'll Receive - You Owe"
          ],
          example: `If Ali owes you ${symbol} 200 and you owe Hassan ${symbol} 100, your Settlement Delta is +${symbol} 100.`
        };

      case "youllReceive":
        return {
          title: "📥 You'll Receive",
          description: "Money that others owe you from expenses you paid on their behalf.",
          details: [
            "💰 This is money you're expecting to get back",
            "📈 Increases when you pay for others in group expenses",
            "📉 Decreases when others pay you back",
            "🎯 Your Available Budget will increase only after you mark 'Received'"
          ],
          example: `You paid ${symbol} 900 for dinner with 3 people. Others owe you ${symbol} 600 (their ${symbol} 300 each).`
        };

      case "youOwe":
        return {
          title: "📤 You Owe",
          description: "Money you need to pay to others who paid expenses on your behalf.",
          details: [
            "💸 This is money you need to give to others",
            "📈 Increases when others pay for you in group expenses",
            "📉 Decreases when you pay them back",
            "🎯 Your Available Budget will decrease only after you mark 'Paid'"
          ],
          example: `Hassan paid ${symbol} 600 for groceries with 3 people. You owe Hassan ${symbol} 200 (your share).`
        };

      default:
        return { title: "", description: "", details: [], example: "" };
    }
  };

  const content = getContent();

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {content.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {content.description}
          </p>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">How it works:</h4>
            <ul className="space-y-1">
              {content.details.map((detail, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="mt-0.5">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {content.example && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-medium text-sm text-blue-900 mb-1">Example:</h4>
              <p className="text-xs text-blue-700">{content.example}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FinancialInfoDialog;