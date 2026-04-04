import { Router } from 'express';
import { CashierDepositController } from '../controllers/cashier_deposit.controller';

const router = Router();

// POST /api/cashier/deposit/search - Search player by phone number
router.post('/search', CashierDepositController.searchPlayer);

// POST /api/cashier/deposit/process - Process deposit to player
router.post('/process', CashierDepositController.deposit);

export default router;
