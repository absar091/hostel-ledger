import re

with open('src/components/AddExpenseSheet.tsx', 'r') as f:
    content = f.read()

# Let's replace the splitDetails useMemo block
search_block = """  // Calculate split details for display
  const splitDetails = useMemo(() => {
    const totalAmount = parseFloat(amount) || 0;
    const count = participants.length || 1;
    const perPerson = count > 0 ? Math.round((totalAmount / count) * 100) / 100 : 0;

    // Logic:
    // If I paid (paidBy === me), I receive (Total - MyShare)
    // If someone else paid, I owe MyShare

    // Ideally we'd use calculateExpenseSplit here, but for display simplicity:
    return {
      perPerson,
      toReceive: (totalAmount - perPerson), // Rough estimate for UI
      toGive: perPerson,
      othersCount: Math.max(0, count - 1)
    };
  }, [amount, participants]);"""

replace_block = """  // Calculate split details for display
  const splitDetails = useMemo(() => {
    const totalAmount = parseFloat(amount) || 0;
    const count = participants.length || 1;
    const perPerson = count > 0 ? Math.round((totalAmount / count) * 100) / 100 : 0;

    let myTotalPaid = 0;
    const isCurrentUserParticipant = participants.includes(user?.uid || '');
    const myShare = isCurrentUserParticipant ? perPerson : 0;

    if (payerMode === 'multiple') {
      const myPayerEntry = multiPayers.find(p => p.id === user?.uid);
      if (myPayerEntry) {
        myTotalPaid = parseFloat(myPayerEntry.amount) || 0;
      }
    } else {
      if (paidBy === user?.uid) {
        myTotalPaid = totalAmount;
      }
    }

    const netBalance = myTotalPaid - myShare;

    return {
      perPerson,
      toReceive: netBalance > 0 ? netBalance : 0,
      toGive: netBalance < 0 ? Math.abs(netBalance) : 0,
      othersCount: Math.max(0, count - 1),
      netBalance
    };
  }, [amount, participants, payerMode, multiPayers, paidBy, user?.uid]);"""

content = content.replace(search_block, replace_block)

# Now we also need to update how it displays in the summary blocks
search_display_1 = """                    {splitDetails.toReceive > 0 && (
                      <div className="text-[#4a6850] font-black mt-2 text-sm">
                        {t('sheets.add_expense.you_will_receive', { amount: formatAmount(splitDetails.toReceive), count: splitDetails.othersCount, people: splitDetails.othersCount === 1 ? t('sheets.add_expense.person') : t('sheets.add_expense.people') })}
                      </div>
                    )}
                    {splitDetails.toGive > 0 && (
                      <div className="text-red-600 font-black mt-2 text-sm">
                        {t('sheets.add_expense.you_owe', { amount: formatAmount(splitDetails.toGive), name: paidByName })}
                      </div>
                    )}"""

replace_display_1 = """                    {splitDetails.toReceive > 0 && (
                      <div className="text-[#4a6850] font-black mt-2 text-sm">
                        {payerMode === 'multiple'
                           ? `You will receive ${formatAmount(splitDetails.toReceive)}`
                           : t('sheets.add_expense.you_will_receive', { amount: formatAmount(splitDetails.toReceive), count: splitDetails.othersCount, people: splitDetails.othersCount === 1 ? t('sheets.add_expense.person') : t('sheets.add_expense.people') })}
                      </div>
                    )}
                    {splitDetails.toGive > 0 && (
                      <div className="text-red-600 font-black mt-2 text-sm">
                        {payerMode === 'multiple'
                           ? `You owe ${formatAmount(splitDetails.toGive)}`
                           : t('sheets.add_expense.you_owe', { amount: formatAmount(splitDetails.toGive), name: paidByName })}
                      </div>
                    )}"""

content = content.replace(search_display_1, replace_display_1)


search_display_2 = """                      {splitDetails.toReceive > 0 && (
                        <div className="text-emerald-200 font-black mt-3 text-lg">
                          You will receive {formatAmount(splitDetails.toReceive)}
                        </div>
                      )}
                      {splitDetails.toGive > 0 && (
                        <div className="text-orange-200 font-black mt-3 text-lg">
                          You owe {formatAmount(splitDetails.toGive)}
                        </div>
                      )}"""

replace_display_2 = """                      {splitDetails.toReceive > 0 && (
                        <div className="text-emerald-200 font-black mt-3 text-lg">
                          You will receive {formatAmount(splitDetails.toReceive)}
                        </div>
                      )}
                      {splitDetails.toGive > 0 && (
                        <div className="text-orange-200 font-black mt-3 text-lg">
                          You owe {formatAmount(splitDetails.toGive)}
                        </div>
                      )}"""

content = content.replace(search_display_2, replace_display_2)


with open('src/components/AddExpenseSheet.tsx', 'w') as f:
    f.write(content)
