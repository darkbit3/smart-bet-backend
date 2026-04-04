import { Router } from 'express';
import { AdminTransactionsController } from '../controllers/admin_transactions.controller';
import { authenticateAdmin } from '../middleware/adminAuth.middleware';

const router = Router();

/**
 * GET /api/admin-transactions
 * Get admin transactions with pagination, search, and filtering
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - search: string (optional)
 * - type: string ('all', 'deposit', 'withdraw') (default: 'all')
 * @access Private (Admin only)
 */
router.get('/', authenticateAdmin, AdminTransactionsController.getTransactions);

/**
 * GET /api/admin-transactions/summary
 * Get transaction summary statistics for the current admin
 * @access Private (Admin only)
 */
router.get('/summary', authenticateAdmin, AdminTransactionsController.getTransactionSummary);

export default router;
