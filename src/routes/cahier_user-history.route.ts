import { Router } from 'express';
import { CashierUserHistoryController } from '../controllers/cahier_user-history.controller';

const router = Router();

// POST /api/cashier/user-history/search - Search user history by phone number
router.post('/search', CashierUserHistoryController.searchUserHistory);

export default router;
