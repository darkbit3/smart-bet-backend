import { Router } from 'express';
import { AdminCashierListController } from '../controllers/admin-cashier-list.controller';

const router = Router();

// GET /admin-cashier-list - Get cashiers by admin username
router.get('/', AdminCashierListController.getCashiersByAdmin);

// POST /admin-cashier-list/init-table - Initialize cashier table
router.post('/init-table', AdminCashierListController.initializeCashierTable);

export default router;
