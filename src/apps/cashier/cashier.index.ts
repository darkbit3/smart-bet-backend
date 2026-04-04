import { Router } from 'express';
import { cashierAuthRoutes } from './routes/cashierAuth';
import { CashierLoginController } from '../../controllers/cashier_login.controller';
import cashierProfileRoutes from '../../routes/cashier_profile.route';
import { CashierPasswordController } from '../../controllers/cashier_password.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import cashierDepositRoutes from '../../routes/cashier_deposit.route';
import { playerRoutes } from '../../routes/player.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import balanceRoutes from '../../routes/balance.routes';
import cashierPlayerCreateRoutes from '../../routes/cashier_player_create.route';
import { cashierPlayerListRoutes } from '../../routes/cashier-playerlist.route';
import cashierPlayersRoutes from '../../routes/cashier_players.route';
import { CASHIER_APP_CONFIG } from '../app.config';

const router = Router();

// Add login route directly
router.post('/login', CashierLoginController.login);

// Add password route directly with auth middleware
router.post('/password', authMiddleware, async (req, res) => {
  await CashierPasswordController.changePassword(req as any, res);
});

// Mount cashier-specific routes
router.use('/auth', cashierAuthRoutes);
router.use('/profile', cashierProfileRoutes);
router.use('/deposit', cashierDepositRoutes);
router.use('/create', cashierPlayerCreateRoutes);
router.use('/playerlist', cashierPlayerListRoutes);
router.use('/players', cashierPlayersRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/balance', balanceRoutes);

// Cashier app info endpoint
router.get('/info', (req, res) => {
  res.json({
    app: CASHIER_APP_CONFIG.name,
    version: '1.0.0',
    features: CASHIER_APP_CONFIG.features,
    endpoints: {
      auth: '/auth',
      login: '/login',
      playerlist: '/playerlist',
      players: '/players',
      transactions: '/transactions',
      deposits: '/deposits',
      withdrawals: '/withdrawals',
      reports: '/reports'
    }
  });
});

export { router as cashierRoutes };
