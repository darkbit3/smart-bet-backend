import { Request, Response } from 'express';
import { AdminBalanceService } from '../services/admin_balance.service';

export class AdminBalanceController {
  // Get current admin balance
  static async getCurrentBalance(req: Request, res: Response) {
    try {
      const adminUsername = (req as any).user?.username;
      
      if (!adminUsername) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required'
        });
      }
      
      const result = await AdminBalanceService.getAdminBalance(adminUsername);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
      
    } catch (error) {
      console.error('Get admin balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Update admin balance
  static async updateBalance(req: Request, res: Response) {
    try {
      const adminUsername = (req as any).user?.username;
      const { new_balance } = req.body;
      
      if (!adminUsername) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required'
        });
      }
      
      // Validate new balance
      if (typeof new_balance !== 'number' || new_balance < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid balance amount'
        });
      }
      
      const result = await AdminBalanceService.updateAdminBalance(adminUsername, new_balance);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      
    } catch (error) {
      console.error('Update admin balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Get balance history
  static async getBalanceHistory(req: Request, res: Response) {
    try {
      const adminUsername = (req as any).user?.username;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!adminUsername) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required'
        });
      }
      
      // Validate limit
      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be between 1 and 100'
        });
      }
      
      const result = await AdminBalanceService.getBalanceHistory(adminUsername, limit);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
      
    } catch (error) {
      console.error('Get balance history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Refresh balance (endpoint for frontend to trigger refresh)
  static async refreshBalance(req: Request, res: Response) {
    try {
      const adminUsername = (req as any).user?.username;
      
      if (!adminUsername) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required'
        });
      }
      
      const result = await AdminBalanceService.getAdminBalance(adminUsername);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Balance refreshed successfully',
          balance: result.balance,
          last_updated: result.last_updated,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json(result);
      }
      
    } catch (error) {
      console.error('Refresh balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
