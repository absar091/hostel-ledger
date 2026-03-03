import re

file_path = 'src/pages/ReceiptPage.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Update "Paid By" logic to handle multiple payers
paid_by_block = r'<p className="font-black text-xs text-slate-900">\{type === "expense" \? transaction\.paidByName : transaction\.fromName\}</p>'
paid_by_replacement = '<p className="font-black text-xs text-slate-900">{type === "expense" ? (transaction.payers && transaction.payers.length > 1 ? `${transaction.payers.length} People` : transaction.paidByName) : transaction.fromName}</p>'

content = re.sub(paid_by_block, paid_by_replacement, content)

# Update share string for multiple payers
share_block = r'\$\{type === "expense" \? `Paid by: \$\{transaction\.paidByName\}` : `From: \$\{transaction\.fromName\} To: \$\{transaction\.toName\}`\}'
share_replacement = '${type === "expense" ? `Paid by: ${transaction.payers && transaction.payers.length > 1 ? transaction.payers.length + \' People\' : transaction.paidByName}` : `From: ${transaction.fromName} To: ${transaction.toName}`}'

content = re.sub(share_block, share_replacement, content)

with open(file_path, 'w') as f:
    f.write(content)
