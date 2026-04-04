import { Request, Response } from 'express';
import { RegistrationService } from '../services/registration.service';

export class RegistrationController {
  /**
   * Request registration OTP
   */
  static async requestRegistrationOtp(req: Request, res: Response): Promise<void> {
    try {
      const { username, phone_number, password, confirm_password, referral_code } = req.body;
      
      if (!username || !phone_number || !password || !confirm_password) {
        res.status(400).json({
          success: false,
          message: 'Username, phone number, password, and confirm password are required'
        });
        return;
      }

      const result = await RegistrationService.getInstance().requestRegistrationOtp({
        username,
        phone_number,
        password,
        confirm_password,
        referral_code
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: result.data
        });
      }
    } catch (error) {
      console.error('Request registration OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verify registration OTP and complete registration
   */
  static async verifyRegistrationOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, registrationCode } = req.body;
      
      if (!phoneNumber || !registrationCode) {
        res.status(400).json({
          success: false,
          message: 'Phone number and registration code are required'
        });
        return;
      }

      const result = await RegistrationService.getInstance().verifyRegistrationOtp(phoneNumber, registrationCode);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Verify registration OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Check for pending registration codes
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

      const result = await RegistrationService.getInstance().checkPendingRegistrationCodes(phoneNumber, telegramUserId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Check pending codes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Resend registration OTP
   */
  static async resendRegistrationOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
        return;
      }

      const result = await RegistrationService.getInstance().resendRegistrationOtp(phoneNumber);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Resend registration OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
