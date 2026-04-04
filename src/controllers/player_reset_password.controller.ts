import { Request, Response } from 'express';
import { PlayerResetPasswordService } from '../services/player_reset_password.service';
import { dbManager } from '../database/databaseManager';

export class PlayerResetPasswordController {
  /**
   * Request password reset with phone number
   */
  static async requestReset(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
        return;
      }

      const result = await PlayerResetPasswordService.requestReset(phoneNumber);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Password reset code sent to your Telegram',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to send reset code',
          data: result.data
        });
      }
    } catch (error) {
      console.error('Request reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verify reset code
   */
  static async verifyCode(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, resetCode } = req.body;
      
      if (!phoneNumber || !resetCode) {
        res.status(400).json({
          success: false,
          message: 'Phone number and reset code are required'
        });
        return;
      }

      const result = await PlayerResetPasswordService.verifyCode(phoneNumber, resetCode);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Reset code verified successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Invalid reset code'
        });
      }
    } catch (error) {
      console.error('Verify reset code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Reset password with verification code
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, resetCode, newPassword } = req.body;
      
      if (!phoneNumber || !resetCode || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Phone number, reset code, and new password are required'
        });
        return;
      }

      const result = await PlayerResetPasswordService.resetPassword(phoneNumber, resetCode, newPassword);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Password reset successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to reset password'
        });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Check if phone number is registered with Telegram
   */
  static async checkTelegramIntegration(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
        return;
      }

      const result = await PlayerResetPasswordService.checkTelegramIntegration(phoneNumber);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Phone number is registered with Telegram',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Phone number not found in Telegram users'
        });
      }
    } catch (error) {
      console.error('Check Telegram integration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Check for pending reset codes
   */
  static async checkPendingCodes(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, telegramUserId } = req.body;
      
      if (!phoneNumber || !telegramUserId) {
        res.status(400).json({
          success: false,
          message: 'Phone number and Telegram user ID are required'
        });
        return;
      }

      // Query telegram_reset table for pending codes
      const sqlite = dbManager.getSQLite();
      const result = await sqlite.all(
        'SELECT * FROM telegram_reset WHERE phone_number = ? AND status = ? AND expires_at > CURRENT_TIMESTAMP',
        [phoneNumber, 'pending']
      );

      if (result && result.length > 0) {
        res.status(200).json({
          success: true,
          message: `Found ${result.length} pending reset codes`,
          data: { pendingCodes: result }
        });
      } else {
        res.status(200).json({
          success: true,
          message: 'No pending reset codes found',
          data: { pendingCodes: [] }
        });
      }
    } catch (error) {
      console.error('Check pending reset codes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
