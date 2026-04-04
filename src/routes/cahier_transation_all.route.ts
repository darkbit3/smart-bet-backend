import { Router } from 'express';
import { CashierTransactionAllController } from '../controllers/cashier_transation_all.controller';

const router = Router();

// POST /api/cashier/transactions/all - Get all transactions for cashier
router.post('/all', CashierTransactionAllController.getAllTransactions);

// POST /api/cashier/transactions/deposit - Get deposit transactions for cashier
router.post('/deposit', CashierTransactionAllController.getDepositTransactions);

// POST /api/cashier/transactions/withdraw - Get withdraw transactions for cashier
router.post('/withdraw', CashierTransactionAllController.getWithdrawTransactions);

export default router;
