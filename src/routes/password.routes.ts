import { Router } from 'express';
import { PasswordController } from '../controllers/password.controller';
import { authenticateToken } from '../middleware/authenticate';

const router = Router();

// Change password (protected)
router.post('/change-password', authenticateToken, PasswordController.changePassword);

export default router;
