import { Request, Response } from 'express';
import { AdminCashierWithdrawService } from '../services/admin_cashier_withdraw.service';
import { AdminCashierWithdrawRequest } from '../models/admin_transaction.model';

export class AdminCashierWithdrawController {
  /**
   * Process withdrawal from cashier to admin
   */
  static async processWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      // Get admin username from authentication (assuming it's set in middleware)
      const adminUsername = (req as any).user?.username;
      
      if (!adminUsername) {
        res.status(401).json({
          success: false,
          message: 'Admin authentication required.'
        });
        return;
      }

      // Validate request body
      const { cashier_username, amount, description }: AdminCashierWithdrawRequest = req.body;

      if (!cashier_username || !amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Cashier username and positive amount are required.'
        });
        return;
      }

      // Process withdrawal
      const result = await AdminCashierWithdrawService.processWithdrawal(
        { cashier_username, amount, description },
        adminUsername
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Withdrawal controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during withdrawal processing.'
      });
    }
  }

  /**
   * Get withdrawal history for admin
   */
  static async getWithdrawalHistory(req: Request, res: Response): Promise<void> {
    try {
      const adminUsername = (req as any).user?.username;
      
      if (!adminUsername) {
        res.status(401).json({
          success: false,
          message: 'Admin authentication required.'
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const history = await AdminCashierWithdrawService.getWithdrawalHistory(
        adminUsername,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        message: 'Withdrawal history retrieved successfully.',
        data: history,
        pagination: {
          limit,
          offset,
          count: history.length
        }
      });
    } catch (error) {
      console.error('Get withdrawal history controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving withdrawal history.'
      });
    }
  }

  /**
   * Get transaction summary for admin
   */
  static async getTransactionSummary(req: Request, res: Response): Promise<void> {
    try {
      const adminUsername = (req as any).user?.username;
      
      if (!adminUsername) {
        res.status(401).json({
          success: false,
          message: 'Admin authentication required.'
        });
        return;
      }

      const summary = await AdminCashierWithdrawService.getTransactionSummary(adminUsername);

      res.status(200).json({
        success: true,
        message: 'Transaction summary retrieved successfully.',
        data: summary
      });
    } catch (error) {
      console.error('Get transaction summary controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving transaction summary.'
      });
    }
  }
}
