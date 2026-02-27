import re

file_path = 'backend-server/server.js'

with open(file_path, 'r') as f:
    content = f.read()

# Pattern to find the add-expense endpoint
# It starts with: app.post('/api/add-expense', generalLimiter, async (req, res) => {
# And ends before: // Record Payment endpoint (Secure)

start_marker = "app.post('/api/add-expense', generalLimiter, async (req, res) => {"
end_marker = "// Record Payment endpoint (Secure)"

# New implementation
new_implementation = """app.post('/api/add-expense', generalLimiter, async (req, res) => {
  let { groupId, amount, paidBy, payers, participants, note, place } = req.body;

  // Validate Lengths
  const noteError = validateNote(note);
  if (noteError) return res.status(400).json({ success: false, error: noteError });

  const placeError = validatePlace(place);
  if (placeError) return res.status(400).json({ success: false, error: placeError });

  note = sanitize(note);
  place = sanitize(place);

  const currentUserId = req.user.uid;

  if (!groupId || !amount || !participants || participants.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  // Normalize Payers
  // If 'payers' array is provided, use it. Otherwise, fallback to 'paidBy' single payer.
  let finalPayers = [];
  if (payers && Array.isArray(payers) && payers.length > 0) {
    finalPayers = payers;
    // Validate total paid equals amount (allow small floating point diff)
    const totalPaid = finalPayers.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    if (Math.abs(totalPaid - amount) > 0.05) {
        return res.status(400).json({ success: false, error: `Total paid amount (${totalPaid}) does not match expense amount (${amount})` });
    }
  } else if (paidBy) {
    if (!isValidFirebaseId(paidBy)) {
        return res.status(400).json({ success: false, error: 'Invalid payer ID format' });
    }
    finalPayers = [{ id: paidBy, amount: amount }];
  } else {
    return res.status(400).json({ success: false, error: 'Missing payer information' });
  }

  // Set paidBy string for backward compatibility (Legacy UI uses this)
  // If multiple payers, we can set it to the first one or a special string "multiple"
  // But strictly, legacy apps rely on this being a valid member ID to show the avatar.
  // We'll use the payer with the largest amount as the "primary" payer for display.
  const primaryPayer = finalPayers.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
  const primaryPayerId = primaryPayer.id;

  if (!isValidFirebaseId(groupId)) {
    return res.status(400).json({ success: false, error: 'Invalid group ID format' });
  }

  if (!validateAmount(amount)) {
    return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
  }

  try {
    const db = admin.database();

    // Idempotency Check
    let clientTxnId = req.body.clientTxnId;
    if (clientTxnId) {
      const processedRef = db.ref(`processedTxns/${clientTxnId}`);
      const processedSnap = await processedRef.get();
      if (processedSnap.exists()) {
        const data = processedSnap.val();
        console.log(`♻️ Idempotency hit: Returning existing transaction for ${clientTxnId}`);
        return res.json({
          success: true,
          transactionId: data.transactionId,
          duplicate: true,
          message: 'Transaction already processed'
        });
      }
    }

    // 1. Get Group Data & User Data in parallel
    const [groupSnap, userSnap] = await Promise.all([
      db.ref(`groups/${groupId}`).get(),
      db.ref(`users/${currentUserId}`).get()
    ]);

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const group = groupSnap.val();
    const user = userSnap.val();

    // 2. Verify current user is in the group
    let membersArray = normalizeMembers(group.members);
    const member = membersArray.find(m => m.userId === currentUserId || m.id === currentUserId);

    // CRITICAL FIX: Hydrate members with emails from 'users' node
    const emailUpdates = {};
    const isMembersArray = Array.isArray(group.members);

    try {
      const memberHydrationPromises = membersArray.map(async (m, index) => {
        if (m.userId && !m.email) {
          try {
            const userSnap = await db.ref(`users/${m.userId}`).get();
            if (userSnap.exists()) {
              const userData = userSnap.val();
              const email = userData.email;

              if (email) {
                if (isMembersArray) {
                   emailUpdates[`groups/${groupId}/members/${index}/email`] = email;
                } else {
                   const memberKey = Object.keys(group.members).find(k => {
                       const mem = group.members[k];
                       return (mem.id && mem.id === m.id) || k === m.id;
                   });
                   if (memberKey) {
                       emailUpdates[`groups/${groupId}/members/${memberKey}/email`] = email;
                   }
                }
                return { ...m, email };
              }
            }
          } catch (err) {
            console.error(`⚠️ Failed to hydrate email for user ${m.userId}:`, err.message);
          }
        }
        return m;
      });
      membersArray = await Promise.all(memberHydrationPromises);
    } catch (hydrateError) { console.error('Hydration failed', hydrateError); }
    if (!member) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group' });
    }

    // 3. Verify payers and participants exist in group
    // Validate all payers
    for (const p of finalPayers) {
        if (!membersArray.some(m => m.id === p.id)) {
            return res.status(400).json({ success: false, error: `Invalid payer: ${p.id}` });
        }
    }

    const participantMembers = membersArray.filter(m => participants.includes(m.id));
    if (participantMembers.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid participants' });
    }

    // 4. Calculate Split and Settlements (Multi-Payer)
    // Convert logic format: { participantId, amount }
    const formattedPayers = finalPayers.map(p => ({ participantId: p.id, amount: Number(p.amount) }));

    // Splits (Consumption)
    const splits = calculateExpenseSplit(amount, participantMembers.map(m => ({ id: m.id, name: m.name })), primaryPayerId);
    // Convert splits to logic format
    const formattedSplits = splits.map(s => ({ participantId: s.participantId, amount: s.amount }));

    // Use new Multi-Payer Settlement Logic
    const debts = calculateMultiPayerSettlements(formattedSplits, formattedPayers);

    // Fetch existing settlements for all involved users
    const getStorageKey = (memberId) => {
      const m = membersArray.find(mem => mem.id === memberId);
      return (m && m.userId) ? m.userId : memberId;
    };

    const involvedMemberIds = new Set([...finalPayers.map(p => p.id), ...participants]);
    const settlementsMap = {};

    const fetchPromises = Array.from(involvedMemberIds).map(async (memberId) => {
      const storageKey = getStorageKey(memberId);
      const snap = await db.ref(`users/${storageKey}/settlements/${groupId}`).get();
      if (snap.exists()) {
        settlementsMap[storageKey] = snap.val();
      } else {
        settlementsMap[storageKey] = {};
      }
    });

    await Promise.all(fetchPromises);

    // 5. Build multi-path update object
    const updates = {};
    Object.assign(updates, emailUpdates);
    const transactionId = db.ref('transactions').push().key;
    const timestamp = Date.now();
    const serverTime = admin.database.ServerValue.TIMESTAMP;

    // A. Update Wallet Balance (Only for Current User if they paid)
    // Find how much the current user paid
    const currentUserPayerEntry = finalPayers.find(p => {
        // Check if p.id matches current user's member ID
        const payerMember = membersArray.find(m => m.id === p.id);
        return payerMember && (payerMember.userId === currentUserId || payerMember.id === currentUserId);
    });

    const amountPaidByCurrentUser = currentUserPayerEntry ? Number(currentUserPayerEntry.amount) : 0;

    let walletBalanceBefore = user.walletBalance || 0;
    let walletBalanceAfter = walletBalanceBefore;
    const walletBalancesSnapshot = {};

    if (amountPaidByCurrentUser > 0) {
      if (walletBalanceBefore < amountPaidByCurrentUser) {
        return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
      }
      walletBalanceAfter -= amountPaidByCurrentUser;
      // Use atomic increment
      updates[`users/${currentUserId}/walletBalance`] = admin.database.ServerValue.increment(-amountPaidByCurrentUser);

      // Snapshot for Payer (Current User)
      walletBalancesSnapshot[currentUserId] = {
        before: walletBalanceBefore,
        after: walletBalanceAfter
      };
    }

    // B. Create Transaction Record
    const primaryPayerMember = membersArray.find(m => m.id === primaryPayerId);

    const newTransaction = {
      id: transactionId,
      groupId,
      type: "expense",
      title: note || "Expense",
      amount,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      timestamp,
      paidBy: primaryPayerId, // Legacy: Primary payer
      paidByName: primaryPayerMember ? primaryPayerMember.name : "Unknown",
      paidByIsTemporary: !!primaryPayerMember?.isTemporary,
      payers: finalPayers.map(p => {
          const m = membersArray.find(mem => mem.id === p.id);
          return {
              id: p.id,
              name: m ? m.name : "Unknown",
              amount: Number(p.amount),
              userId: m?.userId || null
          };
      }),
      participants: splits.map(s => ({
        id: s.participantId,
        name: s.participantName,
        amount: s.amount,
        isTemporary: !!membersArray.find(m => m.id === s.participantId)?.isTemporary
      })),
      place: place || null,
      note: note || null,
      walletBalanceBefore: amountPaidByCurrentUser > 0 ? walletBalanceBefore : null,
      walletBalanceAfter,
      walletBalances: walletBalancesSnapshot,
      createdAt: new Date().toISOString(),
      serverTimestamp: serverTime
    };

    updates[`transactions/${transactionId}`] = newTransaction;

    if (clientTxnId) {
      updates[`processedTxns/${clientTxnId}`] = {
        transactionId,
        uid: currentUserId,
        timestamp: serverTime,
        createdAt: new Date().toISOString()
      };
    }

    // C. Add to userTransaction lists
    const transactionSummaryBase = {
      type: "expense",
      title: newTransaction.title || "Expense",
      amount,
      createdAt: newTransaction.createdAt,
      groupId,
      timestamp,
      paidBy: primaryPayerId,
      paidByName: primaryPayerMember ? primaryPayerMember.name : "Unknown",
      paidByIsTemporary: !!primaryPayerMember?.isTemporary,
      memberCount: membersArray.length,
      participantsCount: participants.length,
      participants: newTransaction.participants,
      payers: newTransaction.payers // Include payers in summary
    };

    membersArray.forEach(m => {
      if (m.userId) {
        const userSummary = { ...transactionSummaryBase };
        const split = splits.find(s => s.participantId === m.id);
        const paidEntry = finalPayers.find(p => p.id === m.id);

        userSummary.userIsPayer = !!paidEntry;
        userSummary.userIsParticipant = !!split;
        userSummary.userShare = split ? split.amount : 0;
        userSummary.userPaid = paidEntry ? Number(paidEntry.amount) : 0;

        updates[`userTransactions/${m.userId}/${transactionId}`] = userSummary;
      }
    });

    // D. Apply Bidirectional Settlement Updates
    for (const debt of debts) {
      const { debtorId, creditorId, amount } = debt;

      const debtorStorageKey = getStorageKey(debtorId);
      const creditorStorageKey = getStorageKey(creditorId);

      // Debtor owes Creditor
      const debtorSettlements = settlementsMap[debtorStorageKey] || {};
      const debtorToCreditor = debtorSettlements[creditorId] || { toReceive: 0, toPay: 0 };

      let debtorNewToPay = (debtorToCreditor.toPay || 0) + amount;
      let debtorNewToReceive = (debtorToCreditor.toReceive || 0);

      updates[`users/${debtorStorageKey}/settlements/${groupId}/${creditorId}`] = {
        toReceive: Math.max(0, debtorNewToReceive),
        toPay: Math.max(0, debtorNewToPay)
      };

      // Creditor receives from Debtor
      const creditorSettlements = settlementsMap[creditorStorageKey] || {};
      const creditorFromDebtor = creditorSettlements[debtorId] || { toReceive: 0, toPay: 0 };

      let creditorNewToReceive = (creditorFromDebtor.toReceive || 0) + amount;
      let creditorNewToPay = (creditorFromDebtor.toPay || 0);

      updates[`users/${creditorStorageKey}/settlements/${groupId}/${debtorId}`] = {
        toReceive: Math.max(0, creditorNewToReceive),
        toPay: Math.max(0, creditorNewToPay)
      };
    }

    // 6. Execute Atomic Update
    await db.ref().update(updates);

    // --- SYNC WALLET BALANCE ---
    if (amountPaidByCurrentUser > 0) {
      syncWalletBalanceToGroups(db, currentUserId, walletBalanceAfter, user.showBalanceToOthers || false)
        .catch(err => console.error("Wallet sync failed:", err));
    }

    // 7. Notifications
    console.log('🚀 Triggering Notifications for Transaction:', transactionId);

    try {
      const notificationPromises = [];

      // A. Push Notifications
      const membersWithUserId = membersArray.filter(m => m.userId);
      if (membersWithUserId.length > 0) {
        const userIds = membersWithUserId.map(m => m.userId);

        let bodyText = "";
        if (finalPayers.length > 1) {
            bodyText = `${finalPayers.length} people paid Rs ${amount.toLocaleString()} for "${note || 'Expense'}"`;
        } else {
            bodyText = `${primaryPayerMember ? primaryPayerMember.name : "Someone"} paid Rs ${amount.toLocaleString()} for "${note || 'Expense'}"`;
        }

        notificationPromises.push(
          sendOneSignalNotificationInternal({
            userIds,
            title: `New Expense in ${group.name}`,
            body: bodyText,
            data: { type: 'expense', transactionId, groupId, amount }
          })
            .then(() => console.log('✅ Push Notifications Promise Resolved'))
            .catch(err => console.error('⚠️ OneSignal Push failed:', err.message))
        );
      }

      // B. Email Notifications
      const participantsWithEmail = membersArray.filter(m => m.email && !m.isPending);
      if (participantsWithEmail.length > 0) {
        notificationPromises.push((async () => {
          const preferencePromises = participantsWithEmail.map(async (participant) => {
            if (!participant.userId) return { participant, emailEnabled: true };
            try {
              const getPref = admin.firestore().doc(`users/${participant.userId}/preferences/notifications`).get();
              const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000));
              const prefSnap = await Promise.race([getPref, timeout]);
              return {
                participant,
                emailEnabled: prefSnap.exists ? prefSnap.data().emailEnabled !== false : true
              };
            } catch (err) {
              return { participant, emailEnabled: true };
            }
          });

          const results = await Promise.allSettled(preferencePromises);
          const recipientsWithPreference = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value)
            .filter(v => v.emailEnabled)
            .map(v => v.participant);

          if (recipientsWithPreference.length > 0) {
            console.log(`📧 Sending emails to ${recipientsWithPreference.length} recipients...`);
            const emailResults = await Promise.allSettled(recipientsWithPreference.map(recipient => {
              const split = splits.find(s => s.participantId === recipient.id);
              return emailService.sendExpenseNotification(recipient.email, {
                payerName: finalPayers.length > 1 ? "Multiple people" : (primaryPayerMember ? primaryPayerMember.name : "Unknown"),
                amount: amount.toLocaleString(),
                title: note || 'Expense',
                splitAmount: split ? split.amount.toLocaleString() : '0',
                date: new Date(newTransaction.date).toLocaleDateString(),
                groupName: group.name,
                groupId: groupId,
                note: note || ''
              });
            }));
          }
        })());
      }

      const globalTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Global notification timeout')), 8000));
      await Promise.race([Promise.allSettled(notificationPromises), globalTimeout]).catch(e => console.warn('⚠️ Notifications timed out or failed partially:', e.message));

    } catch (notifErr) {
      console.error('⚠️ Notification process failed:', notifErr.message);
    }

    // 8. Success Response
    res.json({
      success: true,
      transactionId,
      transaction: newTransaction
    });

  } catch (error) {
    console.error('❌ Add expense error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});
"""

# Regex replacement
# Using re.DOTALL to match across lines
pattern = re.escape(start_marker) + r".*?" + re.escape(end_marker)
# We need to preserve the end marker (the start of next endpoint)
replacement = new_implementation + "\n\n" + end_marker

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(new_content)

print("Successfully updated add-expense endpoint.")
