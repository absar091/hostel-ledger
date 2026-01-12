import Avatar from "./Avatar";
import { UtensilsCrossed, HandCoins, ShoppingBag, Coffee, Car, Wallet, Plus } from "lucide-react";

interface Participant {
  name: string;
  amount: number;
}

interface TimelineItemProps {
  type: "expense" | "payment" | "wallet_add" | "wallet_deduct";
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
  const Icon = type === "payment" ? HandCoins : 
               type === "wallet_add" ? Plus :
               type === "wallet_deduct" ? Wallet :
               categoryIcons[category];

  // Wallet transactions
  if (type === "wallet_add") {
    return (
      <button
        onClick={onClick}
        className="w-full bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-left hover:bg-emerald-100/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5 text-emerald-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900">{title}</div>
            <div className="text-sm text-gray-500">Added to wallet</div>
          </div>
          
          <div className="text-right shrink-0">
            <div className="font-bold text-emerald-600">+Rs {amount.toLocaleString()}</div>
            <div className="text-xs text-gray-500">{date}</div>
          </div>
        </div>
      </button>
    );
  }

  if (type === "wallet_deduct") {
    return (
      <button
        onClick={onClick}
        className="w-full bg-red-50 border border-red-100 rounded-xl p-4 text-left hover:bg-red-100/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-red-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900">{title}</div>
            <div className="text-sm text-gray-500">Deducted from wallet</div>
          </div>
          
          <div className="text-right shrink-0">
            <div className="font-bold text-red-600">-Rs {amount.toLocaleString()}</div>
            <div className="text-xs text-gray-500">{date}</div>
          </div>
        </div>
      </button>
    );
  }

  if (type === "payment") {
    return (
      <button
        onClick={onClick}
        className="w-full bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-left hover:bg-emerald-100/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <HandCoins className="w-5 h-5 text-emerald-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900">Payment Received</div>
            <div className="text-sm text-gray-500">
              {from} → {to}
            </div>
            {method && (
              <div className="text-xs text-gray-500 mt-1 capitalize">{method}</div>
            )}
          </div>
          
          <div className="text-right shrink-0">
            <div className="font-bold text-emerald-600">+Rs {amount.toLocaleString()}</div>
            <div className="text-xs text-gray-500">{date}</div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">{title}</div>
          <div className="text-sm text-gray-500">Paid by {paidBy}</div>
          
          {participants && participants.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {participants.map((p) => {
                const isPayer = p.name === paidBy;
                return (
                  <span
                    key={p.name}
                    className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 ${
                      isPayer ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="font-medium">{p.name}</span>
                    {isPayer ? (
                      <span className="text-emerald-600">paid</span>
                    ) : (
                      <span className="text-red-600">owes Rs {p.amount}</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="text-right shrink-0">
          <div className="font-bold text-gray-900">Rs {amount.toLocaleString()}</div>
          <div className="text-xs text-gray-500">{date}</div>
        </div>
      </div>
    </button>
  );
};

export default TimelineItem;
