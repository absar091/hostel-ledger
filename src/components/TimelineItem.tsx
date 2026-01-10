import Avatar from "./Avatar";
import { UtensilsCrossed, HandCoins, ShoppingBag, Coffee, Car } from "lucide-react";

interface Participant {
  name: string;
  amount: number;
}

interface TimelineItemProps {
  type: "expense" | "payment";
  title: string;
  amount: number;
  date: string;
  paidBy?: string;
  participants?: Participant[];
  from?: string;
  to?: string;
  method?: string;
  category?: "food" | "shopping" | "transport" | "coffee" | "other";
  onClick?: () => void;
}

const categoryIcons = {
  food: UtensilsCrossed,
  shopping: ShoppingBag,
  transport: Car,
  coffee: Coffee,
  other: HandCoins,
};

const TimelineItem = ({
  type,
  title,
  amount,
  date,
  paidBy,
  participants,
  from,
  to,
  method,
  category = "other",
  onClick,
}: TimelineItemProps) => {
  const Icon = type === "payment" ? HandCoins : categoryIcons[category];

  if (type === "payment") {
    return (
      <button
        onClick={onClick}
        className="w-full bg-positive-soft rounded-xl p-4 text-left hover:opacity-90 transition-opacity"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-positive/20 flex items-center justify-center shrink-0">
            <HandCoins className="w-5 h-5 text-positive" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground">Payment Received</div>
            <div className="text-sm text-muted-foreground">
              {from} → {to}
            </div>
            {method && (
              <div className="text-xs text-muted-foreground mt-1 capitalize">{method}</div>
            )}
          </div>
          
          <div className="text-right shrink-0">
            <div className="font-bold text-positive">+Rs {amount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{date}</div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl p-4 shadow-card text-left hover:shadow-card-hover transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-secondary-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground">{title}</div>
          <div className="text-sm text-muted-foreground">Paid by {paidBy}</div>
          
          {participants && participants.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {participants.map((p) => (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1 text-xs bg-secondary rounded-full px-2 py-1"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-negative">owes Rs {p.amount}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="text-right shrink-0">
          <div className="font-bold text-foreground">Rs {amount.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">{date}</div>
        </div>
      </div>
    </button>
  );
};

export default TimelineItem;
