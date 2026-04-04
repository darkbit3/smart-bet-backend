import { Router } from 'express';
import { CashoutAgentController } from '../controllers/cashout-agent.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// POST /api/cashout-agent/request - Create new cashout request
router.post('/request', (req, res) => {
  const controller = new CashoutAgentController(new (require('../services/cashout-agent.service')).CashoutAgentService());
  controller.createCashoutRequest(req, res);
});

// GET /api/cashout-agent/requests/:cashier_name - Get all cashout requests for a cashier
router.get('/requests/:cashier_name', (req, res) => {
  const controller = new CashoutAgentController(new (require('../services/cashout-agent.service')).CashoutAgentService());
  controller.getCashoutRequestsByCashier(req, res);
});

// GET /api/cashout-agent/code/:code - Get cashout request by code
router.get('/code/:code', (req, res) => {
  const controller = new CashoutAgentController(new (require('../services/cashout-agent.service')).CashoutAgentService());
  controller.getCashoutByCode(req, res);
});

// PUT /api/cashout-agent/status - Update cashout status
router.put('/status', (req, res) => {
  const controller = new CashoutAgentController(new (require('../services/cashout-agent.service')).CashoutAgentService());
  controller.updateCashoutStatus(req, res);
});

// POST /api/cashout-agent/complete/:id - Complete cashout
router.post('/complete/:id', (req, res) => {
  const controller = new CashoutAgentController(new (require('../services/cashout-agent.service')).CashoutAgentService());
  controller.completeCashout(req, res);
});

export default router;
