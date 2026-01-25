import Avatar from "./Avatar";
import { UtensilsCrossed, HandCoins, ShoppingBag, Coffee, Car, Wallet, Plus } from "lucide-react";

interface Participant {
  name: string;
  amount: number;
  isTemporary?: boolean;
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
        className="w-full bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 border border-[#4a6850]/20 rounded-3xl p-5 text-left hover:bg-gradient-to-br hover:from-[#4a6850]/10 hover:to-[#3d5643]/10 hover:border-[#4a6850]/30 transition-all shadow-lg hover:shadow-xl"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center shrink-0 shadow-lg">
            <Plus className="w-6 h-6 text-white font-bold" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-black text-gray-900 tracking-tight text-lg truncate">{title}</div>
            <div className="text-sm text-[#4a6850]/80 font-bold">Added to wallet</div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-black text-[#4a6850] text-xl tracking-tight tabular-nums">+Rs {amount.toLocaleString()}</div>
            <div className="text-xs text-[#4a6850]/60 font-bold">{date}</div>
          </div>
        </div>
      </button>
    );
  }

  if (type === "wallet_deduct") {
    return (
      <button
        onClick={onClick}
        className="w-full bg-gradient-to-br from-red-50 to-orange-50 border border-red-200/50 rounded-3xl p-5 text-left hover:bg-gradient-to-br hover:from-red-100/50 hover:to-orange-100/50 hover:border-red-300/50 transition-all shadow-lg hover:shadow-xl"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg">
            <Wallet className="w-6 h-6 text-white font-bold" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-black text-gray-900 tracking-tight text-lg truncate">{title}</div>
            <div className="text-sm text-red-600/80 font-bold">Deducted from wallet</div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-black text-red-600 text-xl tracking-tight tabular-nums">-Rs {amount.toLocaleString()}</div>
            <div className="text-xs text-red-500/60 font-bold">{date}</div>
          </div>
        </div>
      </button>
    );
  }

  if (type === "payment") {
    return (
      <button
        onClick={onClick}
        className="w-full bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 rounded-3xl p-5 text-left hover:bg-gradient-to-br hover:from-emerald-100/50 hover:to-teal-100/50 hover:border-emerald-300/50 transition-all shadow-lg hover:shadow-xl"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-lg">
            <HandCoins className="w-6 h-6 text-white font-bold" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-black text-gray-900 tracking-tight text-lg truncate">Payment Received</div>
            <div className="text-sm text-emerald-600/80 font-bold truncate">
              {from} → {to}
            </div>
            {method && (
              <div className="text-xs text-emerald-500/60 mt-1 capitalize font-bold">{method}</div>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="font-black text-emerald-600 text-xl tracking-tight tabular-nums">+Rs {amount.toLocaleString()}</div>
            <div className="text-xs text-emerald-500/60 font-bold">{date}</div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-[#4a6850]/10 rounded-3xl p-5 shadow-lg text-left hover:shadow-xl hover:border-[#4a6850]/20 transition-all"
    >
      <div className="flex items-start gap-4">
        {paidBy ? (
          <Avatar name={paidBy} size="md" />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 shadow-lg">
            <Icon className="w-6 h-6 text-gray-600 font-bold" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="font-black text-gray-900 tracking-tight text-lg truncate">{title}</div>
          <div className="text-sm text-gray-600 font-bold truncate">Paid by {paidBy}</div>

          {participants && participants.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {participants.map((p) => {
                const isPayer = p.name === paidBy;
                return (
                  <span
                    key={p.name}
                    className={`inline-flex items-center gap-1 text-xs rounded-2xl px-3 py-1.5 font-black ${isPayer
                      ? "bg-gradient-to-r from-[#4a6850]/20 to-[#3d5643]/20 text-[#4a6850] border border-[#4a6850]/30"
                      : "bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border border-orange-200"
                      }`}
                  >
                    <span className="font-black truncate max-w-[100px]">{p.name}</span>
                    {p.isTemporary && (
                      <span className="px-1 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[8px] font-black uppercase tracking-wider">Temp</span>
                    )}
                    {isPayer ? (
                      <span className="text-[#4a6850]/80 font-bold">paid</span>
                    ) : (
                      <span className="text-red-600 font-bold whitespace-nowrap">owes Rs {p.amount}</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="font-black text-gray-900 text-xl tracking-tight tabular-nums">Rs {amount.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-bold">{date}</div>
        </div>
      </div>
    </button>
  );
};

export default TimelineItem;
