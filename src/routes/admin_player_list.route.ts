import { Router } from 'express';
import { AdminPlayerListController } from '../controllers/admin-player-list.controller';
import { authenticateAdmin } from '../middleware/adminAuth.middleware';

const router = Router();

// GET /admin/player-list - Get all players for admin and their cashiers
router.get('/player-list', authenticateAdmin, AdminPlayerListController.getPlayersByAdmin);

// POST /admin/player-by-phone - Get player by phone number
router.post('/player-by-phone', authenticateAdmin, AdminPlayerListController.getPlayerByPhone);

export default router;
