import re

file_path = 'src/pages/Activity.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Fix the duplicate `isPayer` variable
block = r"""const isPayer = transaction\.paidBy === user\?\.uid;
                const userParticipant = transaction\.participants\?\.find\(\(p: any\) => p\.id === user\?\.uid\);
                const isParticipant = !!userParticipant;
                const isPayer = transaction\.type === "expense" && transaction\.payers
                  \? transaction\.payers\.some\(\(p: any\) => p\.id === user\?\.uid\)
                  : transaction\.paidBy === user\?\.uid;"""
replacement = """const userParticipant = transaction.participants?.find((p: any) => p.id === user?.uid);
                const isParticipant = !!userParticipant;
                const isPayer = transaction.type === "expense" && transaction.payers
                  ? transaction.payers.some((p: any) => p.id === user?.uid)
                  : transaction.paidBy === user?.uid;"""

content = re.sub(block, replacement, content)

# Fix display amount logic
display_amount_block = r"""const displayAmount = transaction\.type === 'expense'
                  \? \(isPayer \? transaction\.amount : isParticipant \? userParticipant\.amount : 0\)
                  : transaction\.amount;"""
display_amount_replacement = """let displayAmount = transaction.amount;
                let amountColorClass = "text-blue-600";

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
                }"""

content = re.sub(display_amount_block, display_amount_replacement, content)

with open(file_path, 'w') as f:
    f.write(content)
