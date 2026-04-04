import { Request, Response } from 'express';
import { userService, CreateUserRequest, LoginRequest } from '@/services/userService';
import { catchAsync } from '@/middleware/errorHandler';
import { ResponseHelper } from '@/utils/response';
import { logger } from '@/utils/logger';
import rateLimit from 'express-rate-limit';

// Enhanced rate limiting for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export class UserAuthController {
  // Register new user
  static register = catchAsync(async (req: Request, res: Response) => {
    const { username, email, phone_number, password, first_name, last_name } = req.body as CreateUserRequest;

    try {
      const result = await userService.register({
        username,
        email,
        phone_number,
        password,
        first_name,
        last_name,
      });

      return ResponseHelper.success(res, {
        user: result.user,
        tokens: result.tokens,
        csrfToken: result.csrfToken,
        message: 'Registration successful',
      }, 'Account created successfully', 201);
    } catch (error: any) {
      logger.warn('Registration attempt failed', {
        username,
        error: error.message,
        ip: req.ip,
      });
      
      return ResponseHelper.fail(res, error.message, 400);
    }
  });

  // Login user
  static login = catchAsync(async (req: Request, res: Response) => {
    const { username, password } = req.body as LoginRequest;

    try {
      const result = await userService.login({ username, password });

      return ResponseHelper.success(res, {
        user: result.user,
        tokens: result.tokens,
        csrfToken: result.csrfToken,
        message: 'Login successful',
      }, 'Welcome back!');
    } catch (error: any) {
      logger.warn('Login attempt failed', {
        username,
        error: error.message,
        ip: req.ip,
      });
      
      return ResponseHelper.fail(res, 'Invalid credentials', 401);
    }
  });

  // Get current user
  static getCurrentUser = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    try {
      const user = await userService.getUserById(userId);
      
      if (!user) {
        return ResponseHelper.fail(res, 'User not found', 404);
      }

      // Get user balance
      const balance = await userService.getBalance(userId);

      return ResponseHelper.success(res, {
        user: {
          ...user,
          balance,
        },
      }, 'User retrieved successfully');
    } catch (error: any) {
      logger.error('Get current user error:', error);
      return ResponseHelper.fail(res, 'Failed to retrieve user', 500);
    }
  });

  // Get user balance
  static getBalance = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    try {
      const balance = await userService.getBalance(userId);

      return ResponseHelper.success(res, {
        balance,
        userId,
      }, 'Balance retrieved successfully');
    } catch (error: any) {
      logger.error('Get balance error:', error);
      return ResponseHelper.fail(res, 'Failed to retrieve balance', 500);
    }
  });

  // Update balance (for testing/admin purposes)
  static updateBalance = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { amount, type } = req.body; // type: 'credit' or 'debit'

    try {
      if (!amount || !type || !['credit', 'debit'].includes(type)) {
        return ResponseHelper.fail(res, 'Invalid amount or type', 400);
      }

      await userService.updateBalance(userId, parseFloat(amount), type);
      const newBalance = await userService.getBalance(userId);

      return ResponseHelper.success(res, {
        newBalance,
        amount: parseFloat(amount),
        type,
      }, 'Balance updated successfully');
    } catch (error: any) {
      logger.error('Update balance error:', error);
      return ResponseHelper.fail(res, 'Failed to update balance', 500);
    }
  });

  // Logout user
  static logout = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    logger.info('User logged out', {
      userId,
      ip: req.ip,
    });

    return ResponseHelper.success(res, null, 'Logged out successfully');
  });

  // Refresh token
  static refreshToken = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
      if (!refreshToken) {
        return ResponseHelper.fail(res, 'Refresh token is required', 400);
      }

      const result = await userService.refreshToken(refreshToken);

      return ResponseHelper.success(res, {
        tokens: result.tokens,
        csrfToken: result.csrfToken,
        message: 'Token refreshed successfully',
      });
    } catch (error: any) {
      logger.warn('Token refresh failed', {
        error: error.message,
        ip: req.ip,
      });
      
      return ResponseHelper.fail(res, 'Invalid refresh token', 401);
    }
  });
}
