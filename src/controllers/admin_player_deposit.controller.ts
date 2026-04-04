import { Request, Response } from 'express';
import { AdminPlayerDepositService, AdminPlayerDepositRequest } from '../services/admin_player_deposit.service';

export class AdminPlayerDepositController {
  // Process deposit from admin to player
  static async processDeposit(req: Request, res: Response) {
    try {
      const adminUsername = (req as any).user?.username;
      
      if (!adminUsername) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required'
        });
      }

      const { player_id, amount, description } = req.body;

      // Validate request
      if (!player_id || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Player ID and amount are required'
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than 0'
        });
      }

      const depositRequest: AdminPlayerDepositRequest = {
        player_id: parseInt(player_id),
        amount: parseFloat(amount),
        description
      };

      const result = await AdminPlayerDepositService.processDeposit(adminUsername, depositRequest);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Admin player deposit controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get deposit history
  static async getDepositHistory(req: Request, res: Response) {
    try {
      const adminUsername = (req as any).user?.username;
      
      if (!adminUsername) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required'
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Validate pagination
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pagination parameters'
        });
      }

      const result = await AdminPlayerDepositService.getDepositHistory(adminUsername, page, limit);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Get deposit history controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get deposit summary
  static async getDepositSummary(req: Request, res: Response) {
    try {
      const adminUsername = (req as any).user?.username;
      
      if (!adminUsername) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required'
        });
      }

      const result = await AdminPlayerDepositService.getDepositSummary(adminUsername);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Get deposit summary controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
