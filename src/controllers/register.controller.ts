import { Request, Response } from 'express';
import { RegisterService } from '../services/register.service';
import { ResponseHelper } from '@/utils/response';
import { logger } from '@/utils/logger';

export class RegisterController {
  private registerService: RegisterService;

  constructor() {
    this.registerService = new RegisterService();
  }

  // Handle registration request
  async register(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔐 Register Controller - Received registration request:', {
        username: req.body.username,
        phone_number: req.body.phone_number,
        hasPassword: !!req.body.password,
        hasReferral: !!req.body.referral_code,
        fullBody: req.body
      });

      const { username, phone_number, password, referral_code } = req.body;

      // Validate input
      if (!username || !phone_number || !password) {
        console.log('❌ Register Controller - Missing required fields:', {
          hasUsername: !!username,
          hasPhone: !!phone_number,
          hasPassword: !!password
        });
        ResponseHelper.fail(res, 'Username, phone number, and password are required', 400);
        return;
      }

      console.log('🔐 Register Controller - Input validation passed');

      // Call register service
      const result = await this.registerService.register({
        username: username.trim(),
        phone_number: phone_number.trim(),
        password: password,
        referral_code: referral_code?.trim()
      });

      if (result.success) {
        console.log('🎉 Register Controller - Registration successful:', {
          player: result.player?.username,
          phone: result.player?.phone_number
        });

        ResponseHelper.success(res, {
          success: true,
          data: {
            player: result.player
          },
          message: result.message
        }, result.message);
      } else {
        console.log('❌ Register Controller - Registration failed:', result.message);
        ResponseHelper.fail(res, result.message, 400);
      }
    } catch (error: any) {
      console.error('❌ Register Controller - Registration error:', error);
      ResponseHelper.fail(res, 'Registration failed. Please try again.', 500);
    }
  }

  // Check username availability
  async checkUsernameAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.body;

      console.log('🔐 Register Controller - Username check request:', { username });

      if (!username) {
        console.log('❌ Register Controller - Username missing');
        ResponseHelper.fail(res, 'Username is required', 400);
        return;
      }

      const isAvailable = await this.registerService.checkUsernameAvailability(username.trim());

      console.log('🔐 Register Controller - Username check result:', { 
        username: username.trim(), 
        available: isAvailable 
      });

      ResponseHelper.success(res, {
        success: true,
        data: {
          username: username.trim(),
          available: isAvailable
        }
      }, 'Username availability check completed');
    } catch (error: any) {
      console.error('❌ Register Controller - Username check error:', error);
      ResponseHelper.fail(res, 'Failed to check username availability', 500);
    }
  }

  // Check phone number availability
  async checkPhoneAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { phone_number } = req.body;

      console.log('🔐 Register Controller - Phone check request:', { phone_number });

      if (!phone_number) {
        console.log('❌ Register Controller - Phone number missing');
        ResponseHelper.fail(res, 'Phone number is required', 400);
        return;
      }

      // Convert 09 format to +251 format for checking
      let formattedPhone = phone_number.trim();
      if (phone_number.startsWith('09')) {
        formattedPhone = '+251' + phone_number.substring(1);
      }

      console.log('🔐 Register Controller - Checking formatted phone:', formattedPhone);

      const isAvailable = await this.registerService.checkPhoneAvailability(formattedPhone);

      console.log('🔐 Register Controller - Phone check result:', { 
        originalPhone: phone_number.trim(),
        formattedPhone, 
        available: isAvailable 
      });

      ResponseHelper.success(res, {
        success: true,
        data: {
          phone_number: formattedPhone,
          available: isAvailable
        }
      }, 'Phone number availability check completed');
    } catch (error: any) {
      console.error('❌ Register Controller - Phone check error:', error);
      ResponseHelper.fail(res, 'Failed to check phone number availability', 500);
    }
  }

  // Validate referral code
  async validateReferralCode(req: Request, res: Response): Promise<void> {
    try {
      const { referral_code } = req.body;

      if (!referral_code) {
        ResponseHelper.success(res, {
          success: true,
          data: {
            referral_code: null,
            valid: true
          }
        }, 'No referral code provided');
        return;
      }

      const isValid = await this.registerService.validateReferralCode(referral_code.trim());

      ResponseHelper.success(res, {
        success: true,
        data: {
          referral_code: referral_code.trim(),
          valid: isValid
        }
      }, 'Referral code validation completed');
    } catch (error: any) {
      console.error('❌ Register Controller - Referral validation error:', error);
      ResponseHelper.fail(res, 'Failed to validate referral code', 500);
    }
  }
}
