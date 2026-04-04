import { Router } from 'express';
import { PlayerController } from '../controllers/player.controller';
import { authenticateToken } from '../middleware/authenticate';

const router = Router();
const playerController = new PlayerController();

// Public routes
router.post('/register', playerController.register);
router.post('/login', playerController.login);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, playerController.getProfile);
router.put('/profile', authenticateToken, playerController.updateProfile);
router.get('/balance', authenticateToken, playerController.getBalance);
router.post('/change-password', authenticateToken, playerController.changePassword);
router.get('/transactions', authenticateToken, playerController.getTransactions);
router.post('/deposit', authenticateToken, playerController.deposit);
router.post('/withdraw', authenticateToken, playerController.withdraw);

// Admin routes (you might want to add admin middleware)
router.get('/', playerController.getAllPlayers);
router.get('/:id', playerController.getPlayerById);
router.put('/:id', playerController.updatePlayer);
router.delete('/:id', playerController.deletePlayer);

// Export as named export to match the import
export const playerRoutes = router;
