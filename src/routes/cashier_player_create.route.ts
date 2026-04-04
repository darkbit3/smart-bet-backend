import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { CashierPlayerCreateController } from '../controllers/cashier_player_create.controller';

const router = Router();

// POST /api/cashier/create/check-username - Check username availability
router.post('/check-username', authMiddleware, async (req, res) => {
  await CashierPlayerCreateController.checkUsername(req as any, res);
});

// POST /api/cashier/create/check-phone - Check phone number availability
router.post('/check-phone', authMiddleware, async (req, res) => {
  await CashierPlayerCreateController.checkPhone(req as any, res);
});

// POST /api/cashier/create/player - Create new player
router.post('/player', authMiddleware, async (req, res) => {
  await CashierPlayerCreateController.createPlayer(req as any, res);
});

export default router;
