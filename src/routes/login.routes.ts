import { Router } from 'express';
import { LoginController } from '../controllers/login.controller';

const router = Router();
const loginController = new LoginController();

// Handle preflight requests
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// POST /api/login - Login with phone number and password
router.post('/login', async (req, res) => {
  await loginController.login(req, res);
});

// POST /api/logout - Logout
router.post('/logout', async (req, res) => {
  await loginController.logout(req, res);
});

export default router;
