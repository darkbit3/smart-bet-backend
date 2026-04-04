import { Router } from 'express';
import { AdminPlayerCheckerController } from '../controllers/admin_player_checker.controller';

const router = Router();

// POST /admin/player-check - Check if username or phone number exists
router.post('/player-check', AdminPlayerCheckerController.checkPlayer);

export default router;