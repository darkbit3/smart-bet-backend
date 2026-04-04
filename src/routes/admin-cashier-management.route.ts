import { Router } from 'express';
import { AdminCashierManagementController } from '../controllers/admin-cashier-management.controller';

const router = Router();

// POST /admin-cashier-management/create - Create new cashier
router.post('/create', AdminCashierManagementController.createCashier);

// GET /admin-cashier-management/search - Search cashiers
router.get('/search', AdminCashierManagementController.searchCashiers);

// GET /admin-cashier-management/check-username - Check username availability
router.get('/check-username', AdminCashierManagementController.checkUsername);

// POST /admin-cashier-management/cashier-by-username - Get cashier by username
router.post('/cashier-by-username', AdminCashierManagementController.getCashierByUsername);

// PUT /admin-cashier-management/update - Update cashier
router.put('/update', AdminCashierManagementController.updateCashier);

// DELETE /admin-cashier-management/delete - Delete cashier
router.delete('/delete', AdminCashierManagementController.deleteCashier);

// PUT /admin-cashier-management/toggle-status - Block/Unblock cashier
router.put('/toggle-status', AdminCashierManagementController.toggleCashierStatus);

// POST /admin-cashier-management/withdraw - Withdraw from cashier
router.post('/withdraw', AdminCashierManagementController.withdrawFromCashier);

// POST /admin-cashier-management/init-table - Initialize cashier table
router.post('/init-table', AdminCashierManagementController.initializeCashierTable);

export default router;
