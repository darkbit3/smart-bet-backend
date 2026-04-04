import { Request, Response } from 'express';
import { CashierProfileService } from '../services/cashier_profile.service';

export class CashierProfileController {
  static async getProfile(req: Request, res: Response) {
    try {
      // Get cashier ID from authenticated user (from JWT token)
      const cashierId = (req as any).user.id;
      
      // Call profile service
      const result = await CashierProfileService.getProfile(cashierId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Profile controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
