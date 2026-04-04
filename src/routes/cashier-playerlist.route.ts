import { Router } from 'express';
import { CashierPlayerListController } from '../controllers/cashier-playerlist.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /api/cashier/playerlist - Get all players for authenticated cashier
router.get('/', CashierPlayerListController.getPlayersByCashier);

// GET /api/cashier/playerlist/paginated - Get paginated players for cashier
router.get('/paginated', CashierPlayerListController.getPlayersPaginated);

// GET /api/cashier/playerlist/search - Search players for cashier
router.get('/search', CashierPlayerListController.searchPlayers);

// GET /api/cashier/playerlist/stats - Get cashier player statistics
router.get('/stats', CashierPlayerListController.getCashierStats);

// GET /api/cashier/playerlist/:id - Get specific player by ID
router.get('/:id', CashierPlayerListController.getPlayerById);

export { router as cashierPlayerListRoutes };
