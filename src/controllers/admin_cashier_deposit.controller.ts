import { Request, Response } from 'express';
import { AdminCashierDepositService } from '../services/admin_cashier_deposit.service';
import { AdminCashierDepositRequest } from '../models/admin_transaction.model';

export class AdminCashierDepositController {
  /**
   * Process deposit from admin to cashier
   */
  static async processDeposit(req: Request, res: Response): Promise<void> {
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
      const { cashier_username, amount, description }: AdminCashierDepositRequest = req.body;

      if (!cashier_username || !amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Cashier username and positive amount are required.'
        });
        return;
      }

      // Process deposit
      const result = await AdminCashierDepositService.processDeposit(
        { cashier_username, amount, description },
        adminUsername
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Deposit controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during deposit processing.'
      });
    }
  }

  /**
   * Get deposit history for admin
   */
  static async getDepositHistory(req: Request, res: Response): Promise<void> {
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

      const history = await AdminCashierDepositService.getDepositHistory(
        adminUsername,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        message: 'Deposit history retrieved successfully.',
        data: history,
        pagination: {
          limit,
          offset,
          count: history.length
        }
      });
    } catch (error) {
      console.error('Get deposit history controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving deposit history.'
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

      const summary = await AdminCashierDepositService.getTransactionSummary(adminUsername);

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
