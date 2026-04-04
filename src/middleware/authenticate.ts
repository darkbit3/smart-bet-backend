import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { config } from '@/config';
import { dbManager } from '../database/databaseManager';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    phone_number: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Auth attempt:', { hasToken: !!token, tokenLength: token?.length });

    if (!token) {
      throw new AppError('Access token is required', 401);
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    console.log('🔓 Token decoded:', { id: decoded.id, username: decoded.username });

    // Find user in database
    const sqlite = dbManager.getSQLite();
    let user = await sqlite.get(
      'SELECT id, username, phone_number, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      // Also check players table
      user = await sqlite.get(
        'SELECT id, username, phone_number, status as is_active FROM players WHERE id = ?',
        [decoded.id]
      );
    }

    console.log('👤 User found:', { found: !!user, table: user ? 'users' : 'none' });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Check if user is active
    if (user.is_active === false || user.is_active === 0) {
      throw new AppError('Account is not active', 403);
    }

    console.log('✅ Auth successful for user:', user.username);

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      phone_number: user.phone_number,
    };

    next();
  } catch (error) {
    console.error('❌ Auth error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      // Find user in database
      const sqlite = dbManager.getSQLite();
      let user = await sqlite.get(
        'SELECT id, username, phone_number, is_active FROM users WHERE id = ?',
        [decoded.id]
      );

      if (!user) {
        // Also check players table
        user = await sqlite.get(
          'SELECT id, username, phone_number, status as is_active FROM players WHERE id = ?',
          [decoded.id]
        );
      }
      
      if (user && user.is_active) {
        req.user = {
          id: user.id,
          username: user.username,
          phone_number: user.phone_number,
        };
      }
    }

    next();
  } catch (error) {
    // Don't fail the request for optional auth, just continue
    next();
  }
};
