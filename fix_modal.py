import re

with open('src/components/TransactionDetailModal.tsx', 'r') as f:
    content = f.read()

search = r"\{\/\* Badge Logic Fixed: Check if user is payer properly, and use resolvedParticipants \*\/\}.*?\{\/\* Payment Details \(for payments\) - iPhone Style \*\/\}"

replace = """{/* Badge Logic Fixed for Multi-Payer */}
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
                            )}

                            {/* Paid By (for expenses) - iPhone Style */}
                            {transaction.paidByName && !isMultiPayer && (
                                <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl lg:rounded-3xl border border-[#4a6850]/20 shadow-lg">
                                    <div className="relative">
                                        <User className="w-5 lg:w-6 h-5 lg:h-6 text-[#4a6850] flex-shrink-0" />
                                        {transactionGroup?.createdBy === transaction.paidBy && (
                                            <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1 py-0.5 rounded-full shadow-sm border border-yellow-200">
                                                OWNER
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] lg:text-xs text-[#4a6850]/70 font-semibold uppercase tracking-wide">Paid by</div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-gray-900 truncate text-sm lg:text-base tracking-tight">
                                                {transactionGroup?.createdBy === transaction.paidBy && !isCurrentUserPayer ? "Group Owner" : resolvedPaidByName}
                                            </div>
                                            {isTemporaryPayer && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">Temp</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment Details (for payments) - iPhone Style */}"""

new_content = re.sub(search, replace, content, flags=re.DOTALL)

with open('src/components/TransactionDetailModal.tsx', 'w') as f:
    f.write(new_content)

print("Replaced!")
