import { Request, Response } from 'express';
import { CashierDepositService } from '../services/cashier_deposit.service';

export class CashierDepositController {
  static async searchPlayer(req: Request, res: Response) {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const result = await CashierDepositService.searchPlayerByPhone(phoneNumber);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Search player controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async deposit(req: Request, res: Response) {
    try {
      const { playerId, amount } = req.body;
      
      if (!playerId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Player ID and amount are required'
        });
      }

      if (typeof playerId !== 'number' || typeof amount !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Player ID and amount must be numbers'
        });
      }

      const result = await CashierDepositService.depositToPlayer(playerId, amount);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Deposit controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
