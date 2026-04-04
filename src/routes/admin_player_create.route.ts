import { Router } from 'express';
import { AdminPlayerCreateController } from '../controllers/admin_player_create.controller';

const router = Router();

// POST /admin/player-create - Create new player
router.post('/player-create', AdminPlayerCreateController.createPlayer);

export default router;