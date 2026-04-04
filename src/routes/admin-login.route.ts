import { Router } from 'express';
import { AdminLoginController } from '../controllers/admin-login.controller';

const router = Router();

// POST /admin-login - Admin login
router.post('/login', AdminLoginController.adminLogin);

// GET /admin-login/current - Get current admin user
router.get('/current', AdminLoginController.getCurrentAdmin);

// PUT /admin-login/balance - Update admin balance
router.put('/balance', AdminLoginController.updateAdminBalance);

// POST /admin-login/init - Initialize admin table
router.post('/init', AdminLoginController.initializeAdminTable);

export default router;
