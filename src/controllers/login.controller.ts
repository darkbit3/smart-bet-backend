import { Request, Response } from 'express';
import { LoginService } from '../services/login.service';
import { ResponseHelper } from '@/utils/response';
import { logger } from '@/utils/logger';

export class LoginController {
  private loginService: LoginService;

  constructor() {
    this.loginService = new LoginService();
  }

  // Handle login request
  async login(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔐 Login Controller - Received login request:', {
        phone_number: req.body.phone_number,
        hasPassword: !!req.body.password
      });

      const { phone_number, password } = req.body;

      // Validate input
      if (!phone_number || !password) {
        console.log('❌ Login Controller - Missing required fields');
        ResponseHelper.fail(res, 'Phone number and password are required', 400);
        return;
      }

      // Validate phone number format (basic Ethiopian format)
      if (!phone_number.match(/^\+2519\d{8}$/) && !phone_number.match(/^09\d{8}$/)) {
        console.log('❌ Login Controller - Invalid phone number format:', phone_number);
        ResponseHelper.fail(res, 'Invalid phone number format. Use +2519xxxxxxxx or 09xxxxxxxx', 400);
        return;
      }

      // Convert 09 format to +251 format
      let formattedPhone = phone_number;
      if (phone_number.startsWith('09')) {
        formattedPhone = '+251' + phone_number.substring(1);
      }

      // Call login service
      const result = await this.loginService.login({
        phone_number: formattedPhone,
        password: password
      });

      if (result.success) {
        console.log('🎉 Login Controller - Login successful:', {
          player: result.player?.username,
          phone: formattedPhone
        });

        ResponseHelper.success(res, {
          success: true,
          data: {
            player: result.player,
            tokens: result.tokens
          },
          message: result.message
        }, result.message);
      } else {
        console.log('❌ Login Controller - Login failed:', result.message);
        ResponseHelper.fail(res, result.message, 401);
      }

    } catch (error: any) {
      console.error('❌ Login Controller - Unexpected error:', error);
      logger.error('Login controller error:', error);
      ResponseHelper.fail(res, 'Login failed. Please try again.', 500);
    }
  }

  // Handle logout request
  async logout(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔐 Login Controller - Logout request');
      
      // TODO: Implement token invalidation if needed
      // For now, just return success
      ResponseHelper.success(res, {
        success: true,
        message: 'Logout successful'
      }, 'Logout successful');

    } catch (error: any) {
      console.error('❌ Login Controller - Logout error:', error);
      logger.error('Logout controller error:', error);
      ResponseHelper.fail(res, 'Logout failed', 500);
    }
  }
}
