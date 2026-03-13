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
            const membersSnap = await db.ref(`groups/${groupId}/members`).once('value');
            const members = membersSnap.val() || {};
            
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

module.exports = {
    startWeeklyReportCron,
    generateAndSendUserReport
};
