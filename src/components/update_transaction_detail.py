import re

file_path = 'src/components/TransactionDetailModal.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Add logic to resolve payers
# Find where resolvedPaidByName is defined and add resolvedPayers logic after it
pattern_resolve = r'const isTemporaryPayer = .*?;'
logic_insert = """
    // 3. Resolve Multiple Payers
    const payersList = transaction.payers || (transaction.paidBy ? [{ id: transaction.paidBy, amount: transaction.amount }] : []);
    const resolvedPayers = payersList.map((p: any) => {
        const member = transactionGroup?.members.find((m: any) => m.id === p.id);
        const isCurrentUser = p.id === user?.uid || (member && member.userId === user?.uid);
        const name = isCurrentUser ? "You" : (member?.name || p.name || "Unknown");
        return {
            ...p,
            name,
            amount: p.amount || transaction.amount // Fallback
        };
    });
    const isMultiPayer = resolvedPayers.length > 1;
"""

content = re.sub(pattern_resolve, lambda m: m.group(0) + logic_insert, content)

# 2. Update Paid By Section
# Find the Paid By block
# Starts with: {transaction.paidByName && (
# Ends with: )} (matching indentation)

# We replace the whole block with new logic
paid_by_start = r'{transaction.paidByName && \('
paid_by_end = r'\)\}' # This is too generic.

# Let's target the inner content of the "Paid By" card.
# <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Paid by</div>
# Replace the content below it.

# Actually, let's wrap the existing block in `!isMultiPayer &&`
# And add a new block for `isMultiPayer`.

# Replace: {transaction.paidByName && (
# With: {transaction.paidByName && !isMultiPayer && (

content = content.replace(
    '{transaction.paidByName && (',
    '{transaction.paidByName && !isMultiPayer && ('
)

# Add Multi-Payer Block after the Single Payer Block
# We look for the closing of the single payer block.
# It's tricky to find the matching closing brace with regex.
# However, the next block is Payment Details: {transaction.fromName && transaction.toName && (

# We can insert BEFORE Payment Details.
payment_start = r'{transaction.fromName && transaction.toName && \('

multi_payer_block = """
                            {/* Multiple Payers - iPhone Style */}
                            {isMultiPayer && (
                                <div className="p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                    <div className="text-[10px] lg:text-xs text-[#4a6850]/70 mb-3 lg:mb-4 font-semibold uppercase tracking-wide">Paid By ({resolvedPayers.length})</div>
                                    <div className="space-y-2 lg:space-y-3 max-h-32 overflow-y-auto scrollbar-hide">
                                        {resolvedPayers.map((payer: any, index: number) => {
                                            const isOwner = transactionGroup?.createdBy === payer.id;
                                            const isMe = payer.id === user?.uid;
                                            return (
                                                <div key={index} className="flex justify-between items-center gap-2">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <span className="font-semibold text-gray-900 truncate text-sm lg:text-base">
                                                            {isOwner && !isMe ? "Group Owner" : payer.name}
                                                        </span>
                                                        {isOwner && (
                                                            <span className="bg-yellow-100 text-yellow-700 text-[8px] px-1 rounded font-black border border-yellow-200 uppercase tracking-wide">Owner</span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs lg:text-sm text-[#4a6850] flex-shrink-0 font-bold tabular-nums">{formatAmount(payer.amount)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            """

content = re.sub(payment_start, lambda m: multi_payer_block + m.group(0), content)

# 3. Update Receipt Logic (Hidden Receipt)
# Similar logic for the receipt section
# Find: {resolvedPaidByName && (
# Replace with check

content = content.replace(
    '{resolvedPaidByName && (',
    '{resolvedPaidByName && !isMultiPayer && ('
)

# Add Multi-Payer Receipt Block
# Insert before Payment (fromName)
receipt_payment_start = r'{transaction.fromName && transaction.toName && \('

multi_payer_receipt = """
                        {/* Multi Payers Receipt */}
                        {isMultiPayer && (
                            <div style={{
                                padding: '14px 16px', background: '#F9FAFB', borderRadius: '16px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '10px' }}>
                                    Paid By ({resolvedPayers.length})
                                </div>
                                {resolvedPayers.map((p: any, i: number) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '6px 0',
                                        borderBottom: i < resolvedPayers.length - 1 ? '1px solid #F3F4F6' : 'none'
                                    }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{p.name}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#4a6850' }}>{formatAmount(p.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        """

# We need to target the receipt section specifically (second occurrence of payment_start)
# Or just insert it before the payment block in receipt
# The file has two sections: Modal and Receipt.
# We replaced the first one already.
# We can find the receipt container ref={receiptRef} and search inside it.

receipt_start_idx = content.find('ref={receiptRef}')
if receipt_start_idx != -1:
    receipt_content = content[receipt_start_idx:]
    pre_receipt = content[:receipt_start_idx]

    # Perform substitution only on receipt content
    new_receipt_content = re.sub(receipt_payment_start, lambda m: multi_payer_receipt + m.group(0), receipt_content)

    content = pre_receipt + new_receipt_content

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully updated TransactionDetailModal.tsx")
