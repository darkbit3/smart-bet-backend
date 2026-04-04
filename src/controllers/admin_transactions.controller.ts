import { Request, Response } from 'express';
import { AdminTransactionsService } from '../services/admin_transactions.service';

export class AdminTransactionsController {
  /**
   * Get admin transactions with pagination, search, and filtering
   */
  static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const adminUsername = (req as any).user?.username;
      
      if (!adminUsername) {
        res.status(401).json({
          success: false,
          message: 'Admin authentication required'
        });
        return;
      }

      // Get query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const searchTerm = req.query.search as string || '';
      const transactionType = req.query.type as string || 'all';

      // Validate parameters
      if (page < 1) {
        res.status(400).json({
          success: false,
          message: 'Page must be greater than 0'
        });
        return;
      }

      if (limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          message: 'Limit must be between 1 and 100'
        });
        return;
      }

      // Validate transaction type
      const validTypes = ['all', 'deposit', 'withdraw'];
      if (!validTypes.includes(transactionType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid transaction type. Must be: all, deposit, or withdraw'
        });
        return;
      }

      // Get transactions
      const result = await AdminTransactionsService.getTransactions(
        adminUsername,
        page,
        limit,
        searchTerm,
        transactionType
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Admin transactions controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get transaction summary statistics
   */
  static async getTransactionSummary(req: Request, res: Response): Promise<void> {
    try {
      const adminUsername = (req as any).user?.username;
      
      if (!adminUsername) {
        res.status(401).json({
          success: false,
          message: 'Admin authentication required'
        });
        return;
      }

      // Get summary
      const result = await AdminTransactionsService.getTransactionSummary(adminUsername);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Transaction summary controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
