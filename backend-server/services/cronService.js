const cron = require('node-cron');
const admin = require('firebase-admin');
const { processTransactions, calculateDebtSummary } = require('../utils/debtLogic');
const emailService = require('./emailService');
const logger = require('../utils/logger');

/**
 * Generates and sends a weekly report to a specific user
 */
const generateAndSendUserReport = async (uid, userEmail, userName, currencyCode = 'PKR') => {
    try {
        const db = admin.database();
        
        // Fetch groups the user belongs to
        const userGroupsSnap = await db.ref(`userGroups/${uid}`).once('value');
        if (!userGroupsSnap.exists()) return false;

        const groupSummaries = [];
        let grandTotalYouOwe = 0;
        let grandTotalTheyOwe = 0;

        const groupIds = Object.keys(userGroupsSnap.val());

        for (const groupId of groupIds) {
            // Fetch group name and emoji
            const groupMetaSnap = await db.ref(`groups/${groupId}`).once('value');
            if (!groupMetaSnap.exists()) continue;
            const groupMeta = groupMetaSnap.val();

            // Fetch transactions for this group
            const txSnap = await db.ref('transactions')
                .orderByChild('groupId')
                .equalTo(groupId)
                .once('value');
            
            const transactions = [];
            txSnap.forEach(s => transactions.push({ id: s.key, ...s.val() }));

            // Calculate debts with everyone in the group
            // ⚡ Bolt Optimization: Extracted child data directly from already fetched parent snapshot to avoid N+1 query bottleneck. Expected impact: Saves 1 database round-trip per group.
            const members = groupMeta.members || {};
            
            let groupBalance = 0;

            for (const memberId in members) {
                if (memberId === uid) continue;
                
                const debts = processTransactions(transactions, uid, memberId);
                const summary = calculateDebtSummary(debts);
                
                groupBalance += summary.netAmount;
                grandTotalYouOwe += summary.totalYouOwe;
                grandTotalTheyOwe += summary.totalTheyOwe;
            }

            groupSummaries.push({
                name: groupMeta.name,
                emoji: groupMeta.emoji,
                balance: groupBalance
            });
        }

        // Sort groups by absolute balance impact
        groupSummaries.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

        // Send the email
        if (groupSummaries.length > 0) {
            await emailService.sendWeeklyReport(userEmail, userName || 'User', {
                totalYouOwe: grandTotalYouOwe,
                totalTheyOwe: grandTotalTheyOwe,
                netAmount: grandTotalTheyOwe - grandTotalYouOwe,
                groupSummaries
            }, currencyCode);
            return true;
        }
        return false;
    } catch (error) {
        logger.error(`❌ Error generating report for user ${uid}:`, error);
        throw error;
    }
};

/**
 * Weekly Financial Summary Cron Job
 * Runs every Sunday at 00:00
 */
const startWeeklyReportCron = () => {
    // Cron schedule: minute hour day-of-month month day-of-week
    // '0 0 * * 0' = Every Sunday at midnight
    cron.schedule('0 0 * * 0', async () => {
        logger.info('⏰ Starting weekly financial report generation...');
        
        try {
            const db = admin.database();
            
            // 1. Fetch all users who have an email
            const usersSnap = await db.ref('users').once('value');
            const users = [];
            usersSnap.forEach(snap => {
                const u = snap.val();
                if (u.email) {
                    users.push({ uid: snap.key, ...u });
                }
            });

            logger.info(`📊 Sending reports to ${users.length} users...`);

            // 2. Process each user
            for (const user of users) {
                try {
                    const sent = await generateAndSendUserReport(
                        user.uid, 
                        user.email, 
                        user.name || user.displayName,
                        user.currency || 'PKR'
                    );
                    if (sent) {
                        logger.info(`✅ Weekly report sent to ${user.email}`);
                    }
                } catch (userError) {
                    logger.error(`❌ Failed to process weekly report for user ${user.uid}:`, userError);
                }
            }

            logger.info('🏁 Weekly financial report generation completed.');

        } catch (error) {
            logger.error('❌ Critical error in weekly report cron:', error);
        }
    });

    logger.info('🚀 Weekly report cron job scheduled (Sunday at midnight)');
};

/**
 * Automated Payment Reminders Cron Job
 * Runs every day at 09:00 AM
 */
const startReminderCron = () => {
    cron.schedule('0 9 * * *', async () => {
        logger.info('⏰ Starting daily payment reminders cron...');
        // Logic for reminders could go here
    });
    logger.info('🚀 Payment reminders cron job scheduled (Daily at 09:00 AM)');
};

/**
 * Daily/Weekly/Monthly Personal Budget Reset Cron Job
 * Runs every day at midnight to check for resets
 */
const startBudgetResetCron = () => {
    cron.schedule('0 0 * * *', async () => {
        logger.info('⏰ Starting personal budget reset cron...');
        
        try {
            const db = admin.database();
            const budgetsSnap = await db.ref('personalBudgets').once('value');
            
            if (!budgetsSnap.exists()) {
                logger.info('ℹ️ No personal budgets to reset.');
                return;
            }

            const updates = {};
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            budgetsSnap.forEach(snap => {
                const uid = snap.key;
                const budget = snap.val();
                
                let shouldReset = false;
                
                if (budget.period === 'daily') {
                    shouldReset = true;
                } else if (budget.period === 'weekly') {
                    // Reset on Mondays
                    if (now.getDay() === 1) shouldReset = true;
                } else if (budget.period === 'monthly') {
                    // Reset on 1st of month
                    if (now.getDate() === 1) shouldReset = true;
                }

                if (shouldReset) {
                    updates[`personalBudgets/${uid}/spent`] = 0;
                    updates[`personalBudgets/${uid}/lastReset`] = todayStr;
                }
            });

            if (Object.keys(updates).length > 0) {
                await db.ref().update(updates);
                logger.info(`✅ Reset ${Object.keys(updates).length} personal budgets.`);
            } else {
                logger.info('ℹ️ No budgets required resetting today.');
            }

        } catch (error) {
            logger.error('❌ Error in budget reset cron:', error);
        }
    });

    logger.info('🚀 Budget reset cron job scheduled (Every night at 00:00)');
};

module.exports = {
    startWeeklyReportCron,
    startBudgetResetCron,
    startReminderCron,
    generateAndSendUserReport
};
