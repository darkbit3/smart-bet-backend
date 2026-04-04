import { Request, Response, NextFunction } from 'express';
import { userService } from '@/services/userService';
import { ResponseHelper } from '@/utils/response';
import { logger } from '@/utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        phone_number: string;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return ResponseHelper.fail(res, 'Access token required', 401);
    }

    // Verify token
    const decoded = userService.verifyToken(token);
    
    // Get user to ensure they still exist and are active
    const user = await userService.getUserById(decoded.id);
    
    if (!user) {
      return ResponseHelper.fail(res, 'User not found', 401);
    }

    // Add user to request object
    req.user = {
      id: user.id,
      username: user.username,
      phone_number: user.phone_number,
    };

    next();
  } catch (error: any) {
    logger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
    });
    
    return ResponseHelper.fail(res, 'Invalid or expired token', 401);
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = userService.verifyToken(token);
      const user = await userService.getUserById(decoded.id);
      
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          phone_number: user.phone_number,
        };
      }
    }

    next();
  } catch (error) {
    // Optional auth - continue even if token is invalid
    next();
  }
};
