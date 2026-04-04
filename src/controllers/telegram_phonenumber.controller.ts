import { Request, Response } from 'express';
import { TelegramPhoneNumberService } from '../services/telegram_phonenumber.service';
import { dbManager } from '../database/databaseManager';

export class TelegramPhoneNumberController {
  /**
   * Save telegram user information when phone number is shared
   */
  static async saveTelegramUser(req: Request, res: Response): Promise<void> {
    try {
      const { telegramUserId, phoneNumber, username, firstName, lastName } = req.body;
      
      if (!telegramUserId || !phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'telegramUserId and phoneNumber are required'
        });
        return;
      }

      const result = await TelegramPhoneNumberService.saveTelegramUser({
        telegramUserId: parseInt(telegramUserId),
        phoneNumber,
        username: username || null,
        firstName: firstName || null,
        lastName: lastName || null
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Telegram user information saved successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to save telegram user'
        });
      }
    } catch (error) {
      console.error('Save telegram user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Check if phone number exists in telegram_users table
   */
  static async verifyPhoneNumber(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.params;
      
      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
        return;
      }

      const result = await TelegramPhoneNumberService.getTelegramUserByPhone(phoneNumber);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Phone number found in telegram users',
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Phone number not found in telegram users'
        });
      }
    } catch (error) {
      console.error('Verify phone number error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get telegram user by telegram user ID
   */
  static async getTelegramUser(req: Request, res: Response): Promise<void> {
    try {
      const { telegramUserId } = req.params;
      
      if (!telegramUserId) {
        res.status(400).json({
          success: false,
          message: 'Telegram user ID is required'
        });
        return;
      }

      const result = await TelegramPhoneNumberService.getTelegramUserById(telegramUserId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Telegram user found',
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Telegram user not found'
        });
      }
    } catch (error) {
      console.error('Get telegram user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Send verification code to telegram user
   */
  static async sendVerificationCode(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, telegramUserId } = req.body;
      
      if (!phoneNumber || !telegramUserId) {
        res.status(400).json({
          success: false,
          message: 'Phone number and telegram user ID are required'
        });
        return;
      }

      const result = await TelegramPhoneNumberService.sendVerificationCode(phoneNumber, telegramUserId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Verification code sent successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to send verification code'
        });
      }
    } catch (error) {
      console.error('Send verification code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verify reset code and update password
   */
  static async verifyResetCode(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, resetCode, newPassword } = req.body;
      
      if (!phoneNumber || !resetCode || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Phone number, reset code, and new password are required'
        });
        return;
      }

      const result = await TelegramPhoneNumberService.verifyResetCode(phoneNumber, resetCode, newPassword);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Password reset successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to verify reset code'
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
}
