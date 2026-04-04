import { Router } from 'express';
import { CashierLoginController } from '../controllers/cashier_login.controller';

const router = Router();

// POST /api/cashier/login - Login cashier
router.post('/login', CashierLoginController.login);

export default router;
