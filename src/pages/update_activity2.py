import re

file_path = 'src/pages/Activity.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Fix the amount Color Class
block = r"""<div className=\{`font-black text-base lg:text-xl tabular-nums tracking-tight \$\{transaction\.type === "expense"
                          \? \(isPayer \|\| isParticipant \? "text-red-600" : "text-slate-400"\)
                          : transaction\.type === "payment" \? "text-\[\#4a6850\]" : "text-blue-600"
                          \}`\}>
                          \{transaction\.type === "expense" && !isPayer && !isParticipant \? "" : \(transaction\.type === "expense" \? "-" : "\+"\)\}
                          \{transaction\.type === "expense" && !isPayer && !isParticipant \? "-" : formatAmount\(displayAmount\)\}
                        </div>"""
replacement = """<div className={`font-black text-base lg:text-xl tabular-nums tracking-tight ${amountColorClass}`}>
                          {transaction.type === "expense" && !isPayer && !isParticipant ? "" : (transaction.type === "expense" ? "-" : "+")}
                          {transaction.type === "expense" && !isPayer && !isParticipant ? "-" : formatAmount(displayAmount)}
                        </div>"""

content = re.sub(block, replacement, content)

with open(file_path, 'w') as f:
    f.write(content)
