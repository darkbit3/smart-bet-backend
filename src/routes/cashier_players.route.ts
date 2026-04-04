import { Router } from 'express';
import { PlayerController } from '../controllers/web/player.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all players created by the authenticated cashier
router.get('/', PlayerController.getPlayersByCashier);

// Search players created by the authenticated cashier
router.get('/search', PlayerController.searchPlayersByCashier);

// Check if phone number exists (and if it belongs to this cashier)
router.get('/check-phone', PlayerController.checkPhoneExists);

// Create a new player (by cashier)
router.post('/', PlayerController.createPlayerByCashier);

// Deposit to player
router.post('/deposit', PlayerController.depositToPlayer);

// Withdraw from player
router.post('/withdraw', PlayerController.withdrawFromPlayer);

export default router;
