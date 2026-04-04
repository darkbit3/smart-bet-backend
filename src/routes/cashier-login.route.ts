import { Router } from 'express';
import { CashierLoginController } from '../controllers/cashier/cashier-login.controller';

const router = Router();
const cashierLoginController = new CashierLoginController();

// Cashier login routes
router.post('/login', cashierLoginController.login);
router.post('/logout', cashierLoginController.logout);
router.post('/verify', cashierLoginController.verifyToken);
router.post('/change-password', cashierLoginController.changePassword);

// Export as named export to match the import
export const cashierLoginRoutes = router;
