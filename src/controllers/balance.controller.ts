import { Request, Response } from 'express';
import { dbManager } from '../database/databaseManager';
import { AuthenticatedRequest } from '../middleware/authenticate';

export class BalanceController {
  // ✅ Get Real-Time User Balance
  static async getUserBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { phoneNumber } = req.query;

      console.log('💰 Balance API - Real-time balance request:', { 
        userId, 
        phoneNumber: phoneNumber ? (phoneNumber as string).substring(0, 6) + '***' : 'not provided'
      });

      // 🔐 Auth check
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const sqlite = dbManager.getSQLite();

      // 👤 Find user by phone number in players table
      let user = await sqlite.get(
        'SELECT id, username, phone_number, balance, withdrawable, non_withdrawable, bonus_balance, status FROM players WHERE phone_number = ?',
        [phoneNumber]
      );

      if (!user) {
        // Also check users table
        user = await sqlite.get(
          'SELECT id, username, phone_number, balance, withdrawable, non_withdrawable, bonus_balance, status FROM users WHERE phone_number = ?',
          [phoneNumber]
        );
      }

      console.log('👤 User found for balance:', { 
        found: !!user, 
        table: user ? 'players' : 'none',
        phone: user?.phone_number,
        dbBalance: user?.balance,
        dbWithdrawable: user?.withdrawable,
        dbNonWithdrawable: user?.non_withdrawable,
        dbBonus: user?.bonus_balance
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this phone number'
        });
      }

      // 💰 Calculate total balance
      const totalBalance = user.balance + user.withdrawable + user.non_withdrawable + user.bonus_balance;

      const balanceData = {
        userId: user.id,
        username: user.username,
        phoneNumber: user.phone_number,
        balance: parseFloat(user.balance) || 0,
        withdrawable: parseFloat(user.withdrawable) || 0,
        non_withdrawable: parseFloat(user.non_withdrawable) || 0,
        bonus_balance: parseFloat(user.bonus_balance) || 0,
        totalBalance: totalBalance,
        status: user.status,
        lastUpdated: new Date().toISOString()
      };

      console.log(' Real balance data prepared:', {
        phone: balanceData.phoneNumber,
        balance: balanceData.balance,
        withdrawable: balanceData.withdrawable,
        non_withdrawable: balanceData.non_withdrawable,
        bonus_balance: balanceData.bonus_balance,
        total: balanceData.totalBalance
      });

      return res.status(200).json({
        success: true,
        message: 'Balance retrieved successfully',
        data: balanceData
      });

    } catch (error: any) {
      console.error('❌ Balance API Error:', error);
      console.error('❌ Stack:', error?.stack);

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // ✅ Update User Balance (for testing/transactions)
  static async updateUserBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { phoneNumber, balance, withdrawable, nonWithdrawable, bonus_balance } = req.body;

      console.log('💰 Balance API - Update balance request:', { 
        userId, 
        phoneNumber: phoneNumber ? phoneNumber.substring(0, 6) + '***' : 'not provided',
        balance,
        withdrawable,
        nonWithdrawable,
        bonus_balance
      });

      // 🔐 Auth check
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const sqlite = dbManager.getSQLite();

      // 👤 Find and update user
      const result = await sqlite.run(
        `UPDATE players SET 
         balance = ?, 
         withdrawable = ?, 
         non_withdrawable = ?, 
         bonus_balance = ?,
         updated_at = datetime('now')
         WHERE phone_number = ?`,
        [balance, withdrawable, nonWithdrawable, bonus_balance, phoneNumber]
      );

      if (result.changes === 0) {
        // Try users table
        const userResult = await sqlite.run(
          `UPDATE users SET 
           balance = ?, 
           withdrawable = ?, 
           non_withdrawable = ?, 
           bonus_balance = ?,
           updated_at = datetime('now')
           WHERE phone_number = ?`,
          [balance, withdrawable, nonWithdrawable, bonus_balance, phoneNumber]
        );

        if (userResult.changes === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
      }

      console.log('✅ Balance updated successfully');

      return res.status(200).json({
        success: true,
        message: 'Balance updated successfully'
      });

    } catch (error: any) {
      console.error('❌ Update Balance Error:', error);
      console.error('❌ Stack:', error?.stack);

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
