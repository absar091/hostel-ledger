const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authenticate = require('../middleware/auth');

// General limiter applied globally in index.js
router.post('/add-expense', authenticate, transactionController.addExpense);
router.post('/record-payment', authenticate, transactionController.recordPayment);
router.post('/update-wallet', authenticate, transactionController.updateWallet);
router.post('/sync-balance-to-groups', authenticate, transactionController.syncBalance);
router.post('/send-money', authenticate, transactionController.sendMoney);
router.post('/respond-money-request', authenticate, transactionController.respondMoneyRequest);

module.exports = router;
