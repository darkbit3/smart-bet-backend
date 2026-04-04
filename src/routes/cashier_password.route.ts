import { Router } from 'express';
import { CashierPasswordController } from '../controllers/cashier_password.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// POST /api/cashier/password - Change cashier password
router.post('/password', authMiddleware, async (req, res) => {
  await CashierPasswordController.changePassword(req as any, res);
});

export default router;
