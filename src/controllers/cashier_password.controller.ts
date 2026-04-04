import { Request, Response } from 'express';
import { CashierPasswordService } from '../services/cashier_password.service';
import { CashierAuthenticatedRequest } from '../middleware/auth.middleware';

export class CashierPasswordController {
  static async changePassword(req: CashierAuthenticatedRequest, res: Response) {
    try {
      // Get cashier ID from authenticated user (from JWT token)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const cashierId = req.user.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password, new password, and confirm password are required'
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password and confirm password do not match'
        });
      }
      
      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password'
        });
      }
      
      // Call password change service
      const result = await CashierPasswordService.changePassword(
        cashierId, 
        currentPassword, 
        newPassword
      );
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Password change controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
