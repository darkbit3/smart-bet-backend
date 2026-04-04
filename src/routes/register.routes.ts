import { Router } from 'express';
import { RegisterController } from '../controllers/register.controller';

const router = Router();
const registerController = new RegisterController();

// Handle preflight requests
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// POST /api/register - Register new player
router.post('/register', async (req, res) => {
  await registerController.register(req, res);
});

// POST /api/check-username - Check username availability
router.post('/check-username', async (req, res) => {
  await registerController.checkUsernameAvailability(req, res);
});

// POST /api/check-phone - Check phone number availability
router.post('/check-phone', async (req, res) => {
  await registerController.checkPhoneAvailability(req, res);
});

// POST /api/validate-referral - Validate referral code
router.post('/validate-referral', async (req, res) => {
  await registerController.validateReferralCode(req, res);
});

export default router;
