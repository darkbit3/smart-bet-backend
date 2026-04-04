import { Request, Response } from 'express';
import { CashierTransactionAllService } from '../services/cashier_transation_all.service';

export class CashierTransactionAllController {
  static async getAllTransactions(req: Request, res: Response) {
    try {
      const { cashierUsername } = req.body;
      
      if (!cashierUsername) {
        return res.status(400).json({
          success: false,
          message: 'Cashier username is required'
        });
      }

      const result = await CashierTransactionAllService.getAllTransactions(cashierUsername);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Get all transactions controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getDepositTransactions(req: Request, res: Response) {
    try {
      const { cashierUsername } = req.body;
      
      if (!cashierUsername) {
        return res.status(400).json({
          success: false,
          message: 'Cashier username is required'
        });
      }

      const result = await CashierTransactionAllService.getDepositTransactions(cashierUsername);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Get deposit transactions controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getWithdrawTransactions(req: Request, res: Response) {
    try {
      const { cashierUsername } = req.body;
      
      if (!cashierUsername) {
        return res.status(400).json({
          success: false,
          message: 'Cashier username is required'
        });
      }

      const result = await CashierTransactionAllService.getWithdrawTransactions(cashierUsername);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Get withdraw transactions controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
