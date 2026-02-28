import re

with open('src/pages/Activity.tsx', 'r') as f:
    content = f.read()

search = """                const isPayer = transaction.paidBy === user?.uid;
                const userParticipant = transaction.participants?.find((p: any) => p.id === user?.uid);
                const isParticipant = !!userParticipant;

                const displayAmount = transaction.type === 'expense'
                  ? (isPayer ? transaction.amount : isParticipant ? userParticipant.amount : 0)
                  : transaction.amount;

                return (
                  <button
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className="w-full bg-white rounded-3xl p-5 border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)] hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all animate-slide-up group text-left"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 lg:w-12 h-11 lg:h-12 rounded-2xl flex items-center justify-center border shadow-lg group-hover:scale-105 transition-transform ${getTransactionColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-black text-gray-900 text-base lg:text-lg tracking-tight mb-0.5 lg:mb-1 truncate">{transaction.title}</div>
                        <div className="text-xs lg:text-sm text-[#4a6850]/80 font-bold truncate">
                          {transactionGroup && (
                            <span className="text-[#4a6850] font-black">{transactionGroup.name} • </span>
                          )}
                          <span>{transaction.date}</span>
                          {transaction.place && (
                            <span className="text-[#4a6850]/60"> • {transaction.place}</span>
                          )}
                        </div>
                        {transaction.note && (
                          <div className="text-[10px] lg:text-xs text-gray-500 mt-0.5 lg:mt-1 font-medium truncate">{transaction.note}</div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className={`font-black text-base lg:text-xl tabular-nums tracking-tight ${transaction.type === "expense"
                          ? (isPayer || isParticipant ? "text-red-600" : "text-slate-400")
                          : transaction.type === "payment" ? "text-[#4a6850]" : "text-blue-600"
                          }`}>"""

replace = """                let displayAmount = transaction.amount;
                let amountColorClass = "text-blue-600";

                const userParticipant = transaction.participants?.find((p: any) => p.id === user?.uid);
                const isParticipant = !!userParticipant;

                if (transaction.type === 'expense') {
                  const payersList = transaction.payers || (transaction.paidBy ? [{ id: transaction.paidBy, amount: transaction.amount }] : []);
                  const userPayer = payersList.find((p: any) => p.id === user?.uid);

                  const shareAmount = userParticipant ? Number(userParticipant.amount) : 0;
                  const paidAmount = userPayer ? Number(userPayer.amount) : 0;
                  const netAmount = paidAmount - shareAmount;

                  if (netAmount > 0.05) {
                    displayAmount = netAmount;
                    amountColorClass = "text-[#4a6850]"; // Lent
                  } else if (netAmount < -0.05) {
                    displayAmount = Math.abs(netAmount);
                    amountColorClass = "text-red-600"; // Owe
                  } else if (shareAmount > 0) {
                    displayAmount = 0;
                    amountColorClass = "text-slate-400"; // Settled
                  } else {
                    displayAmount = 0;
                    amountColorClass = "text-slate-400"; // Not involved
                  }
                } else if (transaction.type === 'payment') {
                  amountColorClass = "text-[#4a6850]";
                }

                return (
                  <button
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className="w-full bg-white rounded-3xl p-5 border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)] hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all animate-slide-up group text-left"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 lg:w-12 h-11 lg:h-12 rounded-2xl flex items-center justify-center border shadow-lg group-hover:scale-105 transition-transform ${getTransactionColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-black text-gray-900 text-base lg:text-lg tracking-tight mb-0.5 lg:mb-1 truncate">{transaction.title}</div>
                        <div className="text-xs lg:text-sm text-[#4a6850]/80 font-bold truncate">
                          {transactionGroup && (
                            <span className="text-[#4a6850] font-black">{transactionGroup.name} • </span>
                          )}
                          <span>{transaction.date}</span>
                          {transaction.place && (
                            <span className="text-[#4a6850]/60"> • {transaction.place}</span>
                          )}
                        </div>
                        {transaction.note && (
                          <div className="text-[10px] lg:text-xs text-gray-500 mt-0.5 lg:mt-1 font-medium truncate">{transaction.note}</div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className={`font-black text-base lg:text-xl tabular-nums tracking-tight ${amountColorClass}`}>"""

new_content = content.replace(search, replace)
if content == new_content:
    print("Replace failed!")
else:
    with open('src/pages/Activity.tsx', 'w') as f:
        f.write(new_content)
    print("Replace succeeded!")
