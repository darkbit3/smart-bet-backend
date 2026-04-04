import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/authenticate';

const router = Router();

// Test endpoint to verify JWT token
router.get('/test-token', authenticateToken, (req, res) => {
  const user = (req as any).user;
  res.json({
    success: true,
    message: 'Token is valid',
    user: user
  });
});

// Debug endpoint without authentication
router.post('/debug-change', (req, res) => {
  console.log('🔍 Debug change request:', req.body);
  res.json({
    success: true,
    message: 'Debug endpoint reached',
    data: req.body
  });
});

// Check username availability
router.post('/check-username', UserController.checkUsernameAvailability);

// Change username (protected)
router.post('/change-username', authenticateToken, UserController.changeUsername);

export default router;
