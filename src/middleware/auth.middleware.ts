import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { config } from '../config';
import { dbManager } from '../database/databaseManager';

export interface CashierAuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    phone_number: string;
    role: string;
  };
}

export const authMiddleware: RequestHandler = async (
  req: CashierAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Cashier Auth attempt:', { hasToken: !!token, tokenLength: token?.length });

    if (!token) {
      throw new AppError('Access token is required', 401);
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    console.log('🔓 Token decoded:', { id: decoded.id, username: decoded.username, role: decoded.role });

    // Check if role is cashier
    if (decoded.role !== 'cashier') {
      throw new AppError('Access denied. Cashier role required.', 403);
    }

    // Find cashier in database - use only existing columns
    const sqlite = dbManager.getSQLite();
    const cashier = await sqlite.get(
      'SELECT id, username, status FROM cashier_users WHERE id = ?',
      [decoded.id]
    );

    console.log('👤 Cashier found:', { found: !!cashier });

    if (!cashier) {
      throw new AppError('Cashier not found', 401);
    }

    // Check if cashier is active
    if (cashier.status !== 'active') {
      throw new AppError('Account is not active', 403);
    }

    console.log('✅ Cashier Auth successful for:', cashier.username);

    // Attach cashier to request
    req.user = {
      id: cashier.id,
      username: cashier.username,
      phone_number: '',
      role: 'cashier'
    };

    next();
  } catch (error) {
    console.error('❌ Cashier Auth error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};
