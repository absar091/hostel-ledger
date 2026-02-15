const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const emailService = require('../services/emailService');

const recipient = process.argv[2];
const type = process.argv[3] || 'all';

if (!recipient) {
    console.error('Usage: node test-email.js <recipient-email> [type]');
    console.error('Types: all, verify, invite, welcome, reset, alert, expense');
    process.exit(1);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log('🧪 Starting Comprehensive Email Test...');
    console.log(`📧 Recipient: ${recipient}`);
    console.log(`🔍 Test Type: ${type}`);
    console.log('---------------------------------------------------');

    // 1. Verify Connection
    console.log('Step 1: Verifying SMTP Connection...');
    const isConnected = await emailService.verifyConnection();
    if (!isConnected) {
        console.error('❌ Failed to connect to SMTP server.');
        return;
    }
    console.log('✅ SMTP Connection Verified.');
    console.log('---------------------------------------------------\n');

    const tests = {
        verify: async () => {
            console.log('1️⃣ Sending Verification Email...');
            return emailService.sendVerification(recipient, '123456', 'Test User');
        },
        invite: async () => {
            console.log('2️⃣ Sending Invitation Email...');
            return emailService.sendInvitation(recipient, 'Alice (Test)', 'Weekend Trip', 'https://hostelledger.aarx.online/join/test-group-id');
        },
        welcome: async () => {
            console.log('3️⃣ Sending Welcome Email...');
            return emailService.sendWelcome(recipient, 'Test User');
        },
        reset: async () => {
            console.log('4️⃣ Sending Password Reset Email...');
            return emailService.sendPasswordReset(recipient, 'https://hostelledger.aarx.online/reset-password?token=test', 'Test User');
        },
        alert: async () => {
            console.log('5️⃣ Sending Transaction Alert...');
            return emailService.sendTransactionAlert({
                email: recipient,
                name: 'Test User',
                transactionType: 'payment',
                amount: '500',
                groupName: 'Weekend Trip',
                date: new Date().toLocaleDateString(),
                description: 'Paid for dinner'
            });
        },
        expense: async () => {
            console.log('6️⃣ Sending Expense Notification...');
            return emailService.sendExpenseNotification(
                recipient,
                {
                    payerName: 'Bob (Test)',
                    amount: '1,200',
                    title: 'Grocery Run',
                    splitAmount: '400',
                    date: new Date().toLocaleDateString(),
                    groupName: 'Hostel Expenses',
                    groupId: 'test-group-id',
                    note: 'Milk, eggs, and bread'
                }
            );
        }
    };

    const runSingleTest = async (name, fn) => {
        try {
            const result = await fn();
            if (result.success) {
                console.log(`✅ ${name} SENT via ${result.provider} (ID: ${result.messageId})`);
            } else {
                console.error(`❌ ${name} FAILED: ${result.error}`);
            }
        } catch (err) {
            console.error(`❌ ${name} ERROR:`, err.message);
        }
    };

    if (type === 'all') {
        const testKeys = Object.keys(tests);
        for (const key of testKeys) {
            await runSingleTest(key.toUpperCase(), tests[key]);
            if (key !== testKeys[testKeys.length - 1]) {
                console.log('⏳ Waiting 2 seconds before next email...');
                await sleep(2000); // Prevent rate limiting
            }
        }
    } else if (tests[type]) {
        await runSingleTest(type.toUpperCase(), tests[type]);
    } else {
        console.error(`❌ Unknown test type: ${type}`);
        console.error('Available types:', Object.keys(tests).join(', '));
    }

    console.log('\n---------------------------------------------------');
    console.log('🏁 Test Run Complete');
}

runTest();
