const admin = require('../config/firebase');
const { calculateExpenseSettlements } = require('../utils/expenseLogic');
const { normalizeMembers } = require('../utils/helpers');
const { syncWalletBalanceToGroups } = require('../services/walletService');
const { sendNotification } = require('../services/pushService');
const emailService = require('../services/emailService');

const calculateExpenseSplit = (totalAmount, participants, payerId) => {
  if (!participants || participants.length === 0) {
    throw new Error("Must have at least one participant");
  }

  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / participants.length);
  const remainderCents = totalCents % participants.length;

  const payerIndex = participants.findIndex(p => p.id === payerId);
  const startIndex = payerIndex >= 0 ? payerIndex : 0;

  return participants.map((participant, index) => {
    const adjustedIndex = (index + participants.length - startIndex) % participants.length;
    const getsRemainder = adjustedIndex < remainderCents;

    return {
      participantId: participant.id,
      participantName: participant.name,
      amount: (baseCents + (getsRemainder ? 1 : 0)) / 100,
      isRemainder: getsRemainder
    };
  });
};

const addExpense = async (req, res) => {
  const { groupId, amount, paidBy, participants, note, place } = req.body;
  const currentUserId = req.user.uid;

  if (!groupId || !amount || !paidBy || !participants || participants.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
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
    try {
      const memberHydrationPromises = membersArray.map(async (m) => {
        if (m.userId && !m.email) {
          try {
            const userSnap = await db.ref(`users/${m.userId}`).get();
            if (userSnap.exists()) {
              const userData = userSnap.val();
              return { ...m, email: userData.email };
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

    // 3. Verify payer and participants exist in group
    const payer = membersArray.find(m => m.id === paidBy);
    if (!payer) {
      return res.status(400).json({ success: false, error: 'Invalid payer' });
    }

    const participantMembers = membersArray.filter(m => participants.includes(m.id));
    if (participantMembers.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid participants' });
    }

    // 4. Calculate Split and Settlements
    const splits = calculateExpenseSplit(amount, participantMembers.map(m => ({ id: m.id, name: m.name })), paidBy);
    const debts = calculateExpenseSettlements(splits, paidBy);

    // Fetch existing settlements for all involved users to ensure accurate updates
    // Map Member ID -> Storage Key (UID for real users, MemberID for temp)
    const getStorageKey = (memberId) => {
      const m = membersArray.find(mem => mem.id === memberId);
      return (m && m.userId) ? m.userId : memberId;
    };

    const involvedMemberIds = new Set([paidBy, ...participants]);
    const settlementsMap = {}; // StorageKey -> { [PeerMemberId]: { toReceive, toPay } }

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
    const transactionId = db.ref('transactions').push().key;
    const timestamp = Date.now();
    const serverTime = admin.database.ServerValue.TIMESTAMP;

    const isCurrentUserPayer = paidBy === currentUserId;

    // A. Update Wallet Balance if current user is payer
    let walletBalanceAfter = user.walletBalance || 0;
    if (isCurrentUserPayer) {
      if ((user.walletBalance || 0) < amount) {
        return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
      }
      walletBalanceAfter -= amount;
      // Use atomic increment to prevent race conditions
      updates[`users/${currentUserId}/walletBalance`] = admin.database.ServerValue.increment(-amount);
    }

    // B. Create Transaction Record
    const newTransaction = {
      id: transactionId,
      groupId,
      type: "expense",
      title: note || "Expense",
      amount,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      timestamp,
      paidBy,
      paidByName: payer.name,
      paidByIsTemporary: !!payer.isTemporary,
      participants: splits.map(s => ({
        id: s.participantId,
        name: s.participantName,
        amount: s.amount,
        isTemporary: !!membersArray.find(m => m.id === s.participantId)?.isTemporary
      })),
      place: place || null,
      note: note || null,
      walletBalanceAfter,
      createdAt: new Date().toISOString(),
      serverTimestamp: serverTime
    };

    updates[`transactions/${transactionId}`] = newTransaction;

    // Record processed transaction for idempotency
    if (clientTxnId) {
      updates[`processedTxns/${clientTxnId}`] = {
        transactionId,
        uid: currentUserId,
        timestamp: serverTime,
        createdAt: new Date().toISOString()
      };
    }

    // C. Add to userTransaction lists for all group members (Denormalized)
    const transactionSummaryBase = {
      type: "expense",
      title: newTransaction.title || "Expense",
      amount,
      createdAt: newTransaction.createdAt,
      groupId,
      timestamp,
      paidBy,
      paidByName: payer.name,
      paidByIsTemporary: !!payer.isTemporary,
      memberCount: membersArray.length,
      participantsCount: participants.length,
      participants: newTransaction.participants // Added to avoid N+1 query
    };

    membersArray.forEach(m => {
      if (m.userId) {
        const userSummary = { ...transactionSummaryBase };
        const split = splits.find(s => s.participantId === m.id);

        userSummary.userIsPayer = (m.id === paidBy);
        userSummary.userIsParticipant = !!split;
        userSummary.userShare = split ? split.amount : 0;

        updates[`userTransactions/${m.userId}/${transactionId}`] = userSummary;
      }
    });

    // D. Apply Bidirectional Settlement Updates
    for (const debt of debts) {
      const { debtorId, creditorId, amount } = debt;

      const debtorStorageKey = getStorageKey(debtorId);
      const creditorStorageKey = getStorageKey(creditorId);

      // 1. Update Debtor's Settlements (Debtor owes Creditor)
      // Path: users/{DebtorStorageKey}/settlements/{GroupId}/{CreditorMemberId}
      const debtorSettlements = settlementsMap[debtorStorageKey] || {};
      const debtorToCreditor = debtorSettlements[creditorId] || { toReceive: 0, toPay: 0 };

      let debtorNewToPay = (debtorToCreditor.toPay || 0) + amount;
      let debtorNewToReceive = (debtorToCreditor.toReceive || 0);

      updates[`users/${debtorStorageKey}/settlements/${groupId}/${creditorId}`] = {
        toReceive: Math.max(0, debtorNewToReceive),
        toPay: Math.max(0, debtorNewToPay)
      };

      // 2. Update Creditor's Settlements (Creditor receives from Debtor)
      // Path: users/{CreditorStorageKey}/settlements/{GroupId}/{DebtorMemberId}
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
    if (isCurrentUserPayer) {
      // Fire and forget
      syncWalletBalanceToGroups(db, currentUserId, walletBalanceAfter, user.showBalanceToOthers || false)
        .catch(err => console.error("Wallet sync failed:", err));
    }

    // 7. Await Notifications (CRITICAL for Vercel/Serverless)
    // Run them BEFORE res.json to ensure the process isn't killed before they finish
    console.log('🚀 Triggering Notifications for Transaction:', transactionId);

    try {
      // Run Push and Email in parallel
      const notificationPromises = [];

      // A. Push Notifications (OneSignal)
      const membersWithUserId = membersArray.filter(m => m.userId);
      if (membersWithUserId.length > 0) {
        const userIds = membersWithUserId.map(m => m.userId);
        notificationPromises.push(
          sendNotification({
            userIds,
            title: `New Expense in ${group.name}`,
            body: `${payer.name} paid Rs ${amount.toLocaleString()} for "${note || 'Expense'}"`,
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
          // Fetch all preferences in parallel
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
              console.warn(`⚠️ Preference check failed for ${participant.email}: ${err.message}. Defaulting to ENABLED.`);
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
                payerName: payer.name,
                amount: amount.toLocaleString(),
                title: note || 'Expense',
                splitAmount: split ? split.amount.toLocaleString() : '0',
                date: new Date(newTransaction.date).toLocaleDateString(),
                groupName: group.name,
                groupId: groupId,
                note: note || ''
              });
            }));
            const successCount = emailResults.filter(r => r.status === 'fulfilled' && r.value?.success).length;
            console.log(`✅ Sent ${successCount}/${recipientsWithPreference.length} expense emails`);
          }
        })());
      }

      // Wait for all notifications (or at least attempt them) with a global timeout for safety
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
};

const recordPayment = async (req, res) => {
  const { groupId, fromMember, toMember, amount, method, note } = req.body;
  const currentUserId = req.user.uid;

  if (!groupId || !fromMember || !toMember || !amount || !method) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const db = admin.database();

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

    // Check for duplicate payment (same from/to/amount/group within 30 seconds)
    const recentPaymentsSnap = await db.ref('transactions')
      .orderByChild('timestamp')
      .startAt(Date.now() - 30000)
      .get();

    if (recentPaymentsSnap.exists()) {
      const recentPayments = recentPaymentsSnap.val();
      const isDuplicate = Object.values(recentPayments).some((tx) =>
        tx.type === 'payment' &&
        tx.from === fromMember &&
        tx.to === toMember &&
        tx.amount === amount &&
        tx.groupId === groupId
      );
      if (isDuplicate) {
        return res.status(409).json({ success: false, error: 'Duplicate payment detected. This payment was already recorded within the last 30 seconds.' });
      }
    }

    // 2. Verify current user is in the group
    const membersArray = normalizeMembers(group.members);
    const member = membersArray.find(m => m.userId === currentUserId || m.id === currentUserId);
    if (!member) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group' });
    }

    // 3. Verify members exist in group
    const fromPerson = membersArray.find(m => m.id === fromMember);
    const toPerson = membersArray.find(m => m.id === toMember);
    if (!fromPerson || !toPerson) {
      return res.status(400).json({ success: false, error: 'Invalid members' });
    }

    // 4. Build multi-path update object
    const updates = {};
    const transactionId = db.ref('transactions').push().key;
    const timestamp = Date.now();
    const serverTime = admin.database.ServerValue.TIMESTAMP;

    const isReceiving = toMember === currentUserId;
    const isPaying = fromMember === currentUserId;

    if (!isReceiving && !isPaying) {
      return res.status(403).json({ success: false, error: 'You must be either the payer or the receiver' });
    }

    // Identify the Other User (Counterparty)
    const otherMemberId = isPaying ? toMember : fromMember;
    const otherPerson = isPaying ? toPerson : fromPerson;

    // Fetch Other User's Data if they are a real user
    let otherUser = null;
    if (otherPerson.userId) {
      const otherUserSnap = await db.ref(`users/${otherPerson.userId}`).get();
      if (otherUserSnap.exists()) {
        otherUser = otherUserSnap.val();
      }
    }

    // A. Update Wallet Balances (For BOTH parties)
    const walletBalancesSnapshot = {};

    // 1. Update Current User (Recorder)
    let currentUserBalanceBefore = user.walletBalance || 0;
    let currentUserBalanceAfter = currentUserBalanceBefore;

    if (isPaying) {
      if (currentUserBalanceBefore < amount) {
        return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
      }
      currentUserBalanceAfter -= amount;
      // Use atomic increment
      updates[`users/${currentUserId}/walletBalance`] = admin.database.ServerValue.increment(-amount);
    } else {
      currentUserBalanceAfter += amount;
      // Use atomic increment
      updates[`users/${currentUserId}/walletBalance`] = admin.database.ServerValue.increment(amount);
    }

    walletBalancesSnapshot[currentUserId] = {
      before: currentUserBalanceBefore,
      after: currentUserBalanceAfter
    };

    // 2. Update Other User (if they exist)
    if (otherUser && otherPerson.userId) {
      let otherUserBalanceBefore = otherUser.walletBalance || 0;
      let otherUserBalanceAfter = otherUserBalanceBefore;

      if (isPaying) {
        // Current user paid -> Other user receives
        otherUserBalanceAfter += amount;
        // Use atomic increment
        updates[`users/${otherPerson.userId}/walletBalance`] = admin.database.ServerValue.increment(amount);
      } else {
        // Current user received -> Other user paid
        if (otherUserBalanceBefore < amount) {
          return res.status(400).json({ success: false, error: 'Other user has insufficient wallet balance' });
        }
        otherUserBalanceAfter -= amount;
        // Use atomic increment
        updates[`users/${otherPerson.userId}/walletBalance`] = admin.database.ServerValue.increment(-amount);
      }

      walletBalancesSnapshot[otherPerson.userId] = {
        before: otherUserBalanceBefore,
        after: otherUserBalanceAfter
      };
    }

    // B. Create Transaction Record
    const newTransaction = {
      id: transactionId,
      groupId,
      type: "payment",
      title: "Payment",
      amount,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      timestamp,
      paidBy: fromMember,
      paidByName: fromPerson.name,
      paidByIsTemporary: !!fromPerson.isTemporary,
      from: fromMember,
      fromName: fromPerson.name,
      fromIsTemporary: !!fromPerson.isTemporary,
      to: toMember,
      toName: toPerson.name,
      toIsTemporary: !!toPerson.isTemporary,
      method,
      note: note || null,
      walletBalanceBefore: currentUserBalanceBefore, // Legacy (Recorder's)
      walletBalanceAfter: currentUserBalanceAfter,   // Legacy (Recorder's)
      walletBalances: walletBalancesSnapshot,        // NEW: Per-user snapshots
      createdAt: new Date().toISOString(),
      serverTimestamp: serverTime
    };

    updates[`transactions/${transactionId}`] = newTransaction;

    // C. Add to userTransaction lists for relevant members (Denormalized)
    const transactionSummaryBase = {
      type: "payment",
      title: newTransaction.title || "Payment",
      amount,
      createdAt: newTransaction.createdAt,
      groupId,
      timestamp,
      paidBy: fromMember,
      from: fromMember, // Alignment with Transaction interface
      to: toMember,     // Alignment with Transaction interface
      paidByName: fromPerson.name,
      fromName: fromPerson.name,
      toName: toPerson.name,
      method,
      memberCount: membersArray.length
    };

    if (fromPerson.userId) {
      const userTxUpdate = { ...transactionSummaryBase };
      userTxUpdate.userRole = 'payer';
      updates[`userTransactions/${fromPerson.userId}/${transactionId}`] = userTxUpdate;
    }
    if (toPerson.userId) {
      const userTxUpdate = { ...transactionSummaryBase };
      userTxUpdate.userRole = 'receiver';
      updates[`userTransactions/${toPerson.userId}/${transactionId}`] = userTxUpdate;
    }

    // D. Update Bidirectional Settlements
    const otherPersonId = isPaying ? toMember : fromMember;
    const currentSettlement = (user.settlements?.[groupId]?.[otherPersonId] || { toReceive: 0, toPay: 0 });

    let newToReceive = currentSettlement.toReceive;
    let newToPay = currentSettlement.toPay;

    if (isPaying) {
      newToPay = Math.max(0, newToPay - amount);
    } else if (isReceiving) {
      newToReceive = Math.max(0, newToReceive - amount);
    }

    // Update current user's view
    updates[`users/${currentUserId}/settlements/${groupId}/${otherPersonId}`] = {
      toReceive: newToReceive,
      toPay: newToPay
    };

    // Update other user's view (Mirror)
    updates[`users/${otherPersonId}/settlements/${groupId}/${currentUserId}`] = {
      toReceive: newToPay,
      toPay: newToReceive
    };

    // 5. Execute Atomic Update
    await db.ref().update(updates);

    // --- SYNC WALLET BALANCE ---
    // Current User
    syncWalletBalanceToGroups(db, currentUserId, currentUserBalanceAfter, user.showBalanceToOthers || false)
      .catch(err => console.error("Wallet sync failed (current):", err));

    // Other User
    if (otherUser && otherPerson.userId) {
      syncWalletBalanceToGroups(db, otherPerson.userId, otherUserBalanceAfter, otherUser.showBalanceToOthers || false)
        .catch(err => console.error("Wallet sync failed (other):", err));
    }

    // 7. Notifications (Awaited for Vercel/Serverless)
    console.log('🚀 Triggering Notifications for Payment:', transactionId);
    try {
      const notificationPromises = [];

      // A. Push Notifications (OneSignal)
      const membersWithUserId = membersArray.filter(m => m.userId);
      if (membersWithUserId.length > 0) {
        const userIds = membersWithUserId.map(m => m.userId);
        notificationPromises.push(
          sendNotification({
            userIds,
            title: `Payment Recorded in ${group.name}`,
            body: isPaying
              ? `${user.name} paid Rs ${amount.toLocaleString()} to ${toPerson.name}`
              : `${fromPerson.name} paid Rs ${amount.toLocaleString()} to ${user.name}`,
            data: { type: 'payment', transactionId, groupId, amount }
          })
            .catch(err => console.error('⚠️ Payment Push failed:', err.message))
        );
      }

      // B. Email Notifications (Send to counterparty)
      if (otherPerson && otherPerson.email) {
        notificationPromises.push((async () => {
          let emailEnabled = true;
          if (otherPerson.userId) {
            try {
              const getPref = admin.firestore().doc(`users/${otherPerson.userId}/preferences/notifications`).get();
              const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000));
              const prefSnap = await Promise.race([getPref, timeout]);
              if (prefSnap.exists && prefSnap.data().emailEnabled === false) emailEnabled = false;
            } catch (err) { /* default to enabled on timeout/error */ }
          }

          if (emailEnabled) {
            await emailService.sendTransactionAlert({
              email: otherPerson.email,
              name: otherPerson.name,
              transactionType: 'payment',
              amount: amount.toLocaleString(),
              groupName: group.name,
              date: newTransaction.date,
              description: isPaying
                ? `You received Rs ${amount.toLocaleString()} from ${user.name}.`
                : `You paid Rs ${amount.toLocaleString()} to ${user.name}.`
            });
            console.log(`📧 Payment notification sent via emailService to ${otherPerson.email}`);
          }
        })().catch(err => console.error('⚠️ Payment Email failed:', err.message)));
      }

      // Wait for notifications with a timeout
      const globalTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Notification timeout')), 8000));
      await Promise.race([Promise.allSettled(notificationPromises), globalTimeout]).catch(e => console.warn('⚠️ Notifications took too long:', e.message));
    } catch (notifErr) {
      console.error('⚠️ Payment Notification process failed:', notifErr.message);
    }

    // 8. Success Response
    res.json({
      success: true,
      transactionId,
      transaction: newTransaction
    });

  } catch (error) {
    console.error('❌ Record payment error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
};

const updateWallet = async (req, res) => {
  const { amount, type, note } = req.body; // type: 'add' or 'deduct'
  const currentUserId = req.user.uid;

  if (typeof amount !== 'number' || amount <= 0 || !['add', 'deduct'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Invalid parameters: amount must be a positive number and type must be add or deduct' });
  }

  try {
    const db = admin.database();
    const userRef = db.ref(`users/${currentUserId}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userSnap.val();
    const currentBalance = user.walletBalance || 0;

    const updates = {};
    let newBalance = currentBalance;
    if (type === 'add') {
      newBalance += amount;
      updates[`users/${currentUserId}/walletBalance`] = admin.database.ServerValue.increment(amount);
    } else {
      if (currentBalance < amount) {
        return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
      }
      newBalance -= amount;
      updates[`users/${currentUserId}/walletBalance`] = admin.database.ServerValue.increment(-amount);
    }

    const transactionId = db.ref('transactions').push().key;
    const serverTime = admin.database.ServerValue.TIMESTAMP;

    // Record internal wallet transaction
    const walletTransaction = {
      id: transactionId,
      type: type === 'add' ? 'wallet_add' : 'wallet_deduct',
      title: type === 'add' ? 'Manual Deposit' : 'Manual Withdrawal',
      amount,
      note: note || `Manual wallet ${type}`,
      timestamp: Date.now(),
      serverTimestamp: serverTime,
      walletBalanceBefore: currentBalance,
      walletBalanceAfter: newBalance,
      userId: currentUserId,
      createdAt: new Date().toISOString()
    };

    const transactionSummary = {
      type: walletTransaction.type,
      title: walletTransaction.title,
      amount,
      createdAt: walletTransaction.createdAt,
      groupId: "wallet",
      timestamp: walletTransaction.timestamp,
      note: walletTransaction.note
    };

    updates[`transactions/${transactionId}`] = walletTransaction;
    updates[`userTransactions/${currentUserId}/${transactionId}`] = transactionSummary;

    await db.ref().update(updates);

    // --- SYNC WALLET BALANCE ---
    syncWalletBalanceToGroups(db, currentUserId, newBalance, user.showBalanceToOthers || false)
      .catch(err => console.error("Wallet sync failed:", err));

    res.json({
      success: true,
      balance: newBalance,
      transactionId,
      transaction: walletTransaction
    });

  } catch (error) {
    console.error('❌ Update wallet error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
};

const syncBalance = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { showBalanceToOthers } = req.body;

    const db = admin.database();
    const userSnap = await db.ref(`users/${userId}`).get();

    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = userSnap.val();
    const currentBalance = userData.walletBalance || 0;

    // Use value from body if provided, otherwise fallback to DB (though body is preferred for immediate toggle)
    const isEnabled = showBalanceToOthers !== undefined ? showBalanceToOthers : (userData.showBalanceToOthers || false);

    // Call helper (we await it here because this is an explicit sync request)
    await syncWalletBalanceToGroups(db, userId, currentBalance, isEnabled);

    res.json({ success: true, message: 'Wallet balance synced to groups' });

  } catch (error) {
    console.error('❌ Sync balance error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
};

// P2P: Send Money
const sendMoney = async (req, res) => {
  const { recipientUsername, amount, note } = req.body;
  const senderUid = req.user.uid;

  if (!recipientUsername || !amount) {
    return res.status(400).json({ success: false, error: 'Recipient and amount are required' });
  }

  if (amount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be positive' });
  }

  try {
    const db = admin.database();

    // 1. Resolve Recipient
    // We reuse the existing username index
    const cleanUsername = recipientUsername.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    const usernameRef = db.ref(`usernames/${cleanUsername}`);
    const usernameSnap = await usernameRef.get();

    if (!usernameSnap.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const uidData = usernameSnap.val();
    const recipientUid = typeof uidData === 'string' ? uidData : (uidData?.uid || uidData?.userId);

    if (!recipientUid) {
      return res.status(404).json({ success: false, error: 'User ID resolution failed' });
    }

    if (recipientUid === senderUid) {
      return res.status(400).json({ success: false, error: 'You cannot send money to yourself' });
    }

    // 2. Get User Details for Metadata
    const [senderSnap, recipientSnap] = await Promise.all([
      db.ref(`users/${senderUid}`).get(),
      db.ref(`users/${recipientUid}`).get()
    ]);

    const sender = senderSnap.val();
    const recipient = recipientSnap.val();

    if (!sender || !recipient) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    // 3. Create Pending Transaction
    const transactionId = db.ref('p2p_transactions').push().key;
    const now = new Date().toISOString();

    // We store this in a root collection "p2p_transactions"
    const p2pTransaction = {
      id: transactionId,
      from: senderUid,
      to: recipientUid,
      amount: Number(amount),
      status: 'pending', // pending_approval
      note: note || '',
      type: 'p2p_transfer',
      senderName: sender.name || 'Unknown',
      senderUsername: sender.username || '',
      receiverName: recipient.name || 'Unknown',
      receiverUsername: recipient.username || '',
      createdAt: now,
      timestamp: Date.now()
    };

    // Atomic update
    const updates = {};
    updates[`p2p_transactions/${transactionId}`] = p2pTransaction;
    updates[`user_p2p_transactions/${senderUid}/${transactionId}`] = p2pTransaction;
    updates[`user_p2p_transactions/${recipientUid}/${transactionId}`] = p2pTransaction;

    await db.ref().update(updates);

    // 4. Send Notification to Recipient
    try {
      const notificationPromises = [];

      // Push Notification
      if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY) {
        notificationPromises.push(
          sendNotification({
            userIds: [recipientUid],
            title: `💰 Money Received from ${sender.name}`,
            body: `${sender.name} wants to send you Rs ${Number(amount).toLocaleString()}. Tap to accept.`,
            data: { type: 'p2p_request', transactionId }
          }).catch(e => console.error('P2P Push failed:', e.message))
        );
      }

      // Email Notification (Optional - keeping it minimal for now)

      await Promise.allSettled(notificationPromises);
    } catch (e) {
      console.error('Notification error', e);
    }

    res.json({ success: true, transactionId, message: 'Money sent! Waiting for acceptance.' });

  } catch (error) {
    console.error('Send money error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// P2P: Respond
const respondMoneyRequest = async (req, res) => {
  const { transactionId, accept } = req.body;
  const responderUid = req.user.uid;

  if (!transactionId) {
    return res.status(400).json({ success: false, error: 'Transaction ID required' });
  }

  try {
    const db = admin.database();
    const txRef = db.ref(`p2p_transactions/${transactionId}`);
    const txSnap = await txRef.get();

    if (!txSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const tx = txSnap.val();

    // Verify the responder is the RECEIVER of the money
    // Only the receiver can "Accept" the money (and thus increase their wallet).
    if (tx.to !== responderUid) {
      return res.status(403).json({ success: false, error: 'Only the receiver can accept this transaction' });
    }

    if (tx.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Transaction is already ${tx.status}` });
    }

    const updates = {};
    const now = new Date().toISOString();

    if (!accept) {
      // REJECT
      updates[`p2p_transactions/${transactionId}/status`] = 'rejected';
      updates[`p2p_transactions/${transactionId}/rejectedAt`] = now;
      updates[`user_p2p_transactions/${tx.from}/${transactionId}/status`] = 'rejected';
      updates[`user_p2p_transactions/${tx.from}/${transactionId}/rejectedAt`] = now;
      updates[`user_p2p_transactions/${tx.to}/${transactionId}/status`] = 'rejected';
      updates[`user_p2p_transactions/${tx.to}/${transactionId}/rejectedAt`] = now;

      await db.ref().update(updates);

      return res.json({ success: true, status: 'rejected' });
    }

    // ACCEPT -> Update Wallets
    // 1. Get current balances
    const [senderSnap, receiverSnap] = await Promise.all([
      db.ref(`users/${tx.from}`).get(),
      db.ref(`users/${tx.to}`).get()
    ]);

    if (!senderSnap.exists() || !receiverSnap.exists()) {
      return res.status(404).json({ success: false, error: 'User profiles not found' });
    }

    const sender = senderSnap.val();
    const receiver = receiverSnap.val();
    const amount = Number(tx.amount);

    const senderBalanceBefore = sender.walletBalance || 0;
    const receiverBalanceBefore = receiver.walletBalance || 0;

    // 2. Calculate new balances
    // Sender LOSES money (they sent it)
    const senderBalanceAfter = senderBalanceBefore - amount;
    // Receiver GAINS money (they accepted it)
    const receiverBalanceAfter = receiverBalanceBefore + amount;

    // 3. Batched Updates
    updates[`p2p_transactions/${transactionId}/status`] = 'completed';
    updates[`p2p_transactions/${transactionId}/completedAt`] = now;

    // Update Denormalized Copies
    updates[`user_p2p_transactions/${tx.from}/${transactionId}/status`] = 'completed';
    updates[`user_p2p_transactions/${tx.from}/${transactionId}/completedAt`] = now;
    updates[`user_p2p_transactions/${tx.to}/${transactionId}/status`] = 'completed';
    updates[`user_p2p_transactions/${tx.to}/${transactionId}/completedAt`] = now;

    // Update Wallets
    updates[`users/${tx.from}/walletBalance`] = senderBalanceAfter;
    updates[`users/${tx.to}/walletBalance`] = receiverBalanceAfter;

    await db.ref().update(updates);

    // --- SYNC WALLET BALANCE ---
    syncWalletBalanceToGroups(db, tx.from, senderBalanceAfter, sender.showBalanceToOthers || false)
      .catch(err => console.error("Wallet sync failed (sender):", err));

    syncWalletBalanceToGroups(db, tx.to, receiverBalanceAfter, receiver.showBalanceToOthers || false)
      .catch(err => console.error("Wallet sync failed (receiver):", err));

    // 4. Notify Sender
    try {
      if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY) {
        sendNotification({
          userIds: [tx.from],
          title: `✅ Money Accepted`,
          body: `${receiver.name} accepted your Rs ${amount.toLocaleString()}.`,
          data: { type: 'p2p_accepted', transactionId }
        }).catch(e => console.error('P2P Push failed:', e.message));
      }
    } catch (e) { }

    res.json({ success: true, status: 'completed', message: 'Transaction completed and wallets updated' });

  } catch (error) {
    console.error('Respond money request error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = {
  addExpense,
  recordPayment,
  updateWallet,
  syncBalance,
  sendMoney,
  respondMoneyRequest
};
