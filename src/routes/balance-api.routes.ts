import { Router } from 'express';
import { BalanceController } from '../controllers/balance.controller';
import { authenticateToken } from '../middleware/authenticate';

const router = Router();

// Get user real-time balance (protected)
router.get('/user-balance', authenticateToken, BalanceController.getUserBalance);

// Update user balance (protected - for testing/transactions)
router.post('/update-balance', authenticateToken, BalanceController.updateUserBalance);

export default router;
