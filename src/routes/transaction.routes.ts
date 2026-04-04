import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authenticateToken } from '../middleware/authenticate';

const router = Router();

// Get user transactions (protected)
router.get('/user-transactions', authenticateToken, TransactionController.getUserTransactions);

// Create transaction (protected - for testing)
router.post('/create-transaction', authenticateToken, TransactionController.createTransaction);

export default router;
