import { Router } from 'express';
import { CashierLoginController } from '../../../controllers/cashier/cashier-login.controller';
import { ResponseHelper } from '../../../utils/response';
import { logger } from '../../../utils/logger';

const router = Router();
const cashierLoginController = new CashierLoginController();

// Handle preflight requests
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// ✅ GET DASHBOARD BALANCE (Protected)
router.get('/balance', async (req, res) => {
  try {
    await cashierLoginController.getDashboardBalance(req, res);
  } catch (error: any) {
    logger.error('Get dashboard balance route error:', error);
    ResponseHelper.fail(res, 'Internal server error', 500);
  }
});

// ✅ GET DASHBOARD BALANCE (TEST - No Auth Required)
router.get('/balance-test', async (req, res) => {
  try {
    console.log('🧪 TEST: Balance endpoint called without auth');
    
    // Get cashier balance from database (hardcoded for kaleab)
    const { sqliteDB } = require('../../../database/sqlite');
    const cashier = await sqliteDB.get(
      'SELECT balance FROM cashier_users WHERE username = ?',
      ['kaleab']
    );

    if (!cashier) {
      console.log('❌ TEST: No cashier found');
      ResponseHelper.fail(res, 'Cashier not found', 404);
      return;
    }

    console.log('✅ TEST: Found cashier balance:', cashier.balance);
    
    ResponseHelper.success(res, {
      balance: cashier.balance || 0,
      message: 'This is a test endpoint - no auth required'
    }, 'Test balance retrieved successfully');

  } catch (error: any) {
    console.error('❌ TEST: Balance endpoint error:', error);
    ResponseHelper.fail(res, error.message || 'Failed to get test balance', 500);
  }
});

export { router as dashboardRoutes };
