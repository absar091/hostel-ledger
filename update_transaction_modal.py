import re

with open('src/components/TransactionDetailModal.tsx', 'r') as f:
    content = f.read()

# Replace the "Your Share" badge logic
search_badge_1 = """                            {/* Badge Logic Fixed: Check if user is payer properly, and use resolvedParticipants */}
                            {transaction.type === 'expense' && !isCurrentUserPayer && (
                                <div className="mb-2">
                                    {(() => {
                                        // Use resolvedParticipants to handle object/array and userId lookup
                                        const userPart = resolvedParticipants.find((p: any) =>
                                            p.id === user?.uid || (p.userId && p.userId === user?.uid)
                                        );

                                        if (userPart) {
                                            return (
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                                                    <span className="text-xs font-black uppercase tracking-wider">Your Share: {formatAmount(userPart.amount)}</span>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                                                    <span className="text-xs font-black uppercase tracking-wider">Not Involved</span>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            )}

                            {transaction.type === 'expense' && isCurrentUserPayer && (
                                <div className="mb-2">
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                                        <span className="text-xs font-black uppercase tracking-wider">Paid by You</span>
                                    </div>
                                </div>
                            )}"""

replace_badge_1 = """                            {/* Badge Logic Fixed for Multi-Payer */}
                            {transaction.type === 'expense' && (
                                <div className="mb-2">
                                    {(() => {
                                        const userPart = resolvedParticipants.find((p: any) =>
                                            p.id === user?.uid || (p.userId && p.userId === user?.uid)
                                        );

                                        const userPayer = resolvedPayers.find((p: any) =>
                                            p.id === user?.uid || (p.userId && p.userId === user?.uid)
                                        );

                                        const shareAmount = userPart ? Number(userPart.amount) : 0;
                                        const paidAmount = userPayer ? Number(userPayer.amount) : 0;
                                        const netAmount = paidAmount - shareAmount;

                                        if (netAmount > 0.05) {
                                            return (
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                                                    <span className="text-xs font-black uppercase tracking-wider">You lent: {formatAmount(netAmount)}</span>
                                                </div>
                                            );
                                        } else if (netAmount < -0.05) {
                                            return (
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                                                    <span className="text-xs font-black uppercase tracking-wider">You owe: {formatAmount(Math.abs(netAmount))}</span>
                                                </div>
                                            );
                                        } else if (shareAmount > 0 && Math.abs(netAmount) <= 0.05) {
                                            return (
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">
                                                    <span className="text-xs font-black uppercase tracking-wider">Settled</span>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                                                    <span className="text-xs font-black uppercase tracking-wider">Not Involved</span>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            )}"""

content = content.replace(search_badge_1, replace_badge_1)

with open('src/components/TransactionDetailModal.tsx', 'w') as f:
    f.write(content)
