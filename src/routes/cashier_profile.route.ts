import { Router } from 'express';
import { CashierProfileController } from '../controllers/cashier_profile.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// GET /api/cashier/profile - Get cashier profile
router.get('/profile', authMiddleware, async (req, res) => {
  await CashierProfileController.getProfile(req as any, res);
});

export default router;
