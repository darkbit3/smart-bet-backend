import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { sqliteDB } from '@/database/sqlite';
import { catchAsync } from '@/middleware/errorHandler';
import { ResponseHelper } from '@/utils/response';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import rateLimit from 'express-rate-limit';

// ✅ Rate limit
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export class AuthController {

  // ✅ Generate JWT
  private static generateTokens(player: any) {
    const payload = {
      id: player.id,
      username: player.username,
      phone_number: player.phone_number,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: '7d',
    });

    const refreshToken = jwt.sign(
      { id: player.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
  }

  // ✅ CSRF
  private static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ✅ REGISTER
  static register = catchAsync(async (req: Request, res: Response) => {
    const { username, phone_number, password, first_name, last_name } = req.body;

    // Basic validation
    if (!username || !phone_number || !password) {
      return ResponseHelper.fail(res, 'Username, phone number, and password are required', 400);
    }

    // Ethiopian phone number validation (must start with +251 and then 9 or 7)
    const phoneRegex = /^\+251[97]\d{8}$/;
    if (!phoneRegex.test(phone_number)) {
      return ResponseHelper.fail(res, 'Phone number must start with +251 followed by 9 or 7 and 8 more digits (e.g., +251912345678)', 400);
    }

    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return ResponseHelper.fail(res, 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character (@$!%*?&)', 400);
    }

    // Check existing
    const existing = await sqliteDB.get(
      `SELECT id FROM players 
       WHERE username = ? OR phone_number = ?`,
      [username, phone_number]
    );

    if (existing) {
      return ResponseHelper.fail(res, 'Username or phone already exists', 400);
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    await sqliteDB.run(
      `INSERT INTO players (
        username, phone_number, password_hash,
        first_name, last_name,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [username, phone_number, password_hash, first_name, last_name]
    );

    const result = await sqliteDB.get(
      'SELECT last_insert_rowid() as id'
    );

    const player = await sqliteDB.get(
      'SELECT * FROM players WHERE id = ?',
      [result.id]
    );

    logger.info('New player registered', {
      playerId: player.id,
      ip: req.ip,
    });

    const tokens = this.generateTokens(player);
    const csrfToken = this.generateCSRFToken();

    return ResponseHelper.success(res, {
      player,
      tokens,
      csrfToken,
    }, 'Account created successfully', 201);
  });

  // ✅ LOGIN
  static login = catchAsync(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const player = await sqliteDB.get(
      `SELECT * FROM players 
       WHERE username = ? OR phone_number = ?`,
      [username, username]
    );

    if (!player) {
      logger.warn('Invalid user login', { username, ip: req.ip });
      return ResponseHelper.fail(res, 'Invalid credentials', 401);
    }

    if (player.status !== 'active') {
      return ResponseHelper.fail(res, 'Account is not active', 403);
    }

    // Compare password
    const isValid = await bcrypt.compare(password, player.password_hash);

    if (!isValid) {
      logger.warn('Wrong password', { playerId: player.id });
      return ResponseHelper.fail(res, 'Invalid credentials', 401);
    }

    const tokens = this.generateTokens(player);
    const csrfToken = this.generateCSRFToken();

    logger.info('Login success', {
      playerId: player.id,
      ip: req.ip,
    });

    return ResponseHelper.success(res, {
      player,
      tokens,
      csrfToken,
    }, 'Login successful');
  });

  // ✅ LOGOUT
  static logout = catchAsync(async (req: Request, res: Response) => {
    logger.info('Logout', {
      playerId: (req as any).user?.id,
    });

    return ResponseHelper.success(res, null, 'Logged out successfully');
  });

  // ✅ REFRESH TOKEN
  static refreshToken = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ResponseHelper.fail(res, 'Refresh token required', 400);
    }

    try {
      const decoded: any = jwt.verify(refreshToken, config.jwt.refreshSecret);

      if (decoded.type !== 'refresh') {
        return ResponseHelper.fail(res, 'Invalid token', 401);
      }

      const player = await sqliteDB.get(
        'SELECT * FROM players WHERE id = ?',
        [decoded.id]
      );

      if (!player || player.status !== 'active') {
        return ResponseHelper.fail(res, 'Invalid token', 401);
      }

      const tokens = this.generateTokens(player);
      const csrfToken = this.generateCSRFToken();

      return ResponseHelper.success(res, {
        tokens,
        csrfToken,
      });

    } catch {
      return ResponseHelper.fail(res, 'Invalid refresh token', 401);
    }
  });

  // ✅ CURRENT USER
  static getCurrentUser = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    const player = await sqliteDB.get(
      'SELECT * FROM players WHERE id = ?',
      [userId]
    );

    if (!player) {
      return ResponseHelper.fail(res, 'User not found', 404);
    }

    return ResponseHelper.success(res, player);
  });

  // ✅ CHANGE PASSWORD
  static changePassword = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    const player = await sqliteDB.get(
      'SELECT * FROM players WHERE id = ?',
      [userId]
    );

    if (!player) {
      return ResponseHelper.fail(res, 'User not found', 404);
    }

    const valid = await bcrypt.compare(currentPassword, player.password_hash);

    if (!valid) {
      return ResponseHelper.fail(res, 'Current password incorrect', 400);
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await sqliteDB.run(
      `UPDATE players 
       SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newHash, userId]
    );

    logger.info('Password changed', { userId });

    return ResponseHelper.success(res, null, 'Password changed successfully');
  });

  // ✅ REQUEST RESET
  static requestPasswordReset = catchAsync(async (req: Request, res: Response) => {
    const { phone_number } = req.body;

    const player = await sqliteDB.get(
      'SELECT * FROM players WHERE phone_number = ?',
      [phone_number]
    );

    if (player) {
      const token = crypto.randomBytes(32).toString('hex');

      logger.info('Reset requested', {
        playerId: player.id,
      });

      // TODO: store token in DB + send SMS
    }

    return ResponseHelper.success(res, null, 'If account exists, reset sent');
  });

  // ✅ RESET PASSWORD (placeholder)
  static resetPassword = catchAsync(async (req: Request, res: Response) => {
    return ResponseHelper.success(res, null, 'Password reset successful');
  });
}