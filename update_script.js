import fs from 'fs';

const path = './src/components/AddExpenseSheet.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /\/\/ Calculate split details for display[\s\S]*?othersCount: Math\.max\(0, count - 1\)\n\s*};\n\s*\}, \[amount, participants\]\);/;

const newSplitDetails = `// Calculate split details for display
  const splitDetails = useMemo(() => {
    const totalAmount = parseFloat(amount) || 0;
    const count = participants.length || 1;
    const perPerson = count > 0 ? Math.round((totalAmount / count) * 100) / 100 : 0;

    let toReceive = 0;
    let toGive = 0;
    const othersCount = Math.max(0, count - 1);

    // Support multiple payers
    if (payerMode === 'multiple' && multiPayers.length > 0) {
      const userPayment = multiPayers.find(p => p.id === user?.uid)?.amount || '0';
      const userTotalPaid = parseFloat(userPayment) || 0;
      const userShare = participants.includes(user?.uid || '') ? perPerson : 0;

      const net = userTotalPaid - userShare;
      if (net > 0) {
        toReceive = net;
      } else if (net < 0) {
        toGive = Math.abs(net);
      }

      return {
        perPerson,
        toReceive,
        toGive,
        othersCount,
        isCurrentUserPayer: userTotalPaid > 0,
        isCurrentUserParticipant: participants.includes(user?.uid || ''),
        actualPaidBy: paidBy
      };
    } else {
      // Single Payer Mode
      const isCurrentUserPayer = paidBy === user?.uid;
      const isCurrentUserParticipant = participants.includes(user?.uid || '');

      if (isCurrentUserPayer) {
        // I paid for the group
        toReceive = isCurrentUserParticipant ? (totalAmount - perPerson) : totalAmount;
      } else {
        // Someone else paid
        if (isCurrentUserParticipant) {
          toGive = perPerson;
        }
      }

      return {
        perPerson,
        toReceive,
        toGive,
        othersCount,
        isCurrentUserPayer,
        isCurrentUserParticipant,
        actualPaidBy: paidBy
      };
    }
  }, [amount, participants, paidBy, user, payerMode, multiPayers]);`;

content = content.replace(regex, newSplitDetails);

fs.writeFileSync(path, content, 'utf8');
