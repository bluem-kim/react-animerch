const express = require('express');
const { createTransaction, getMyTransactions, listTransactions, updateTransactionStatus, getSalesStats } = require('../controllers/transactionController');
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/requireAdmin');

const router = express.Router();

router.post('/transactions', auth, createTransaction);
router.get('/transactions/me', auth, getMyTransactions);
router.get('/transactions', auth, requireAdmin, listTransactions);
router.patch('/transactions/:id/status', auth, requireAdmin, updateTransactionStatus);
router.get('/transactions/stats/sales', auth, requireAdmin, getSalesStats);

module.exports = router;
