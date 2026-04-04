import { Router, Request, Response } from 'express';
import { Database } from 'sqlite3';

const router = Router();

// Simple database connection
const db = new Database('./data/smart-betting.db');

// Simple response helper
class SimpleResponseHelper {
  static success(res: Response, data: any, message?: string) {
    res.json({
      status: 'success',
      data,
      message: message || 'Success'
    });
  }

  static error(res: Response, message: string, statusCode: number = 500) {
    res.status(statusCode).json({
      status: 'error',
      message
    });
  }

  static unauthorized(res: Response, message: string = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static notFound(res: Response, message: string = 'Not found') {
    return this.error(res, message, 404);
  }

  static serverError(res: Response, message: string = 'Internal server error') {
    return this.error(res, message, 500);
  }
}

// Simple auth middleware (for testing)
const simpleAuth = (req: Request & { user?: any }, res: Response, next: any) => {
  // For testing purposes, we'll use a mock user
  // In production, this should verify JWT tokens
  req.user = { id: 1, phone_number: '+251912345678', username: 'testuser' };
  next();
};

// Get current player balance
router.get('/balance', simpleAuth, async (req: Request & { user?: any }, res: Response) => {
  try {
    console.log('💰 Balance API - Fetching balance for user:', req.user?.id);
    
    const playerId = req.user?.id;
    if (!playerId) {
      return SimpleResponseHelper.unauthorized(res, 'User not authenticated');
    }

    // Get player balance from database
    db.get(
      `SELECT 
        balance,
        withdrawable,
        non_withdrawable,
        bonus_balance,
        updated_at as last_updated
      FROM players 
      WHERE id = ? AND status = 'active'`,
      [playerId],
      (err, player: any) => {
        if (err) {
          console.error('❌ Balance API - Database error:', err);
          return SimpleResponseHelper.serverError(res, 'Failed to fetch balance');
        }

        if (!player) {
          return SimpleResponseHelper.notFound(res, 'Player not found');
        }

        const balanceData = {
          balance: player.balance || 0,
          withdrawable: player.withdrawable || 0,
          non_withdrawable: player.non_withdrawable || 0,
          bonus_balance: player.bonus_balance || 0,
          last_updated: player.last_updated || new Date().toISOString()
        };

        console.log('💰 Balance API - Balance data retrieved:', balanceData);
        return SimpleResponseHelper.success(res, balanceData, 'Balance retrieved successfully');
      }
    );

  } catch (error: any) {
    console.error('❌ Balance API - Error fetching balance:', error);
    return SimpleResponseHelper.serverError(res, 'Failed to fetch balance');
  }
});

// Get balance history
router.get('/balance/history', simpleAuth, async (req: Request & { user?: any }, res: Response) => {
  try {
    console.log('💰 Balance API - Fetching balance history for user:', req.user?.id);
    
    const playerId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 50;

    db.all(
      `SELECT 
        id,
        type,
        amount,
        balance_before,
        balance_after,
        description,
        created_at
      FROM balance_history 
      WHERE player_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?`,
      [playerId, limit],
      (err, history: any[]) => {
        if (err) {
          console.error('❌ Balance API - Database error:', err);
          return SimpleResponseHelper.serverError(res, 'Failed to fetch balance history');
        }

        console.log('💰 Balance API - Balance history retrieved:', history.length, 'records');
        return SimpleResponseHelper.success(res, history, 'Balance history retrieved successfully');
      }
    );

  } catch (error: any) {
    console.error('❌ Balance API - Error fetching balance history:', error);
    return SimpleResponseHelper.serverError(res, 'Failed to fetch balance history');
  }
});

// Get transaction history
router.get('/transactions', simpleAuth, async (req: Request & { user?: any }, res: Response) => {
  try {
    console.log('💰 Balance API - Fetching transactions for user:', req.user?.id);
    
    const playerId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 50;

    // Get player phone number first
    db.get(
      'SELECT phone_number FROM players WHERE id = ?',
      [playerId],
      (err, player: any) => {
        if (err) {
          console.error('❌ Balance API - Database error:', err);
          return SimpleResponseHelper.serverError(res, 'Failed to fetch transactions');
        }

        if (!player) {
          return SimpleResponseHelper.notFound(res, 'Player not found');
        }

        // Use existing transactions table with phone number
        db.all(
          `SELECT 
            id,
            phonenumber,
            method as payment_method,
            status,
            old_balance as balance_before,
            new_balance as balance_after,
            time as created_at,
            updated_at
          FROM transactions 
          WHERE phonenumber = ? 
          ORDER BY time DESC 
          LIMIT ?`,
          [player.phone_number, limit],
          (err, transactions: any[]) => {
            if (err) {
              console.error('❌ Balance API - Database error:', err);
              return SimpleResponseHelper.serverError(res, 'Failed to fetch transactions');
            }

            console.log('💰 Balance API - Transactions retrieved:', transactions.length, 'records');
            return SimpleResponseHelper.success(res, transactions, 'Transactions retrieved successfully');
          }
        );
      }
    );

  } catch (error: any) {
    console.error('❌ Balance API - Error fetching transactions:', error);
    return SimpleResponseHelper.serverError(res, 'Failed to fetch transactions');
  }
});

export default router;
