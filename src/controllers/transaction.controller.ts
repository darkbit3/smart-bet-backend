import { Request, Response } from 'express';
import { dbManager } from '../database/databaseManager';
import { AuthenticatedRequest } from '../middleware/authenticate';

export class TransactionController {
  // ✅ Get User Transactions
  static async getUserTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { phoneNumber } = req.query;

      console.log('📊 Transaction history request:', { 
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

      // 👤 Find user by phone number in players table first
      let user = await sqlite.get(
        'SELECT * FROM players WHERE phone_number = ?',
        [phoneNumber]
      );

      if (!user) {
        // Also check users table
        user = await sqlite.get(
          'SELECT * FROM users WHERE phone_number = ?',
          [phoneNumber]
        );
      }

      console.log('👤 User found by phone:', { found: !!user, table: user ? 'players' : 'none' });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this phone number'
        });
      }

      // 📊 Get transactions from Transactions table
      const transactions = await sqlite.all(
        'SELECT id, phonenumber, method, status, time, old_balance, new_balance, created_at, updated_at FROM Transactions WHERE phonenumber = ? ORDER BY time DESC',
        [phoneNumber]
      );

      console.log('📊 Found transactions:', transactions.length);

      return res.status(200).json({
        success: true,
        message: 'Transaction history retrieved successfully',
        transactions: transactions
      });

    } catch (error: any) {
      console.error('❌ Transaction history error:', error);
      console.error('❌ Stack:', error?.stack);

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // ✅ Create Transaction (for testing/demonstration)
  static async createTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { phoneNumber, method, status, old_balance, new_balance } = req.body;

      console.log('💰 Create transaction request:', { 
        userId, 
        phoneNumber: phoneNumber ? phoneNumber.substring(0, 6) + '***' : 'not provided',
        method,
        status,
        old_balance,
        new_balance
      });

      // 🔐 Auth check
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const sqlite = dbManager.getSQLite();

      // 👤 Find user by phone number
      let user = await sqlite.get(
        'SELECT * FROM players WHERE phone_number = ?',
        [phoneNumber]
      );

      if (!user) {
        user = await sqlite.get(
          'SELECT * FROM users WHERE phone_number = ?',
          [phoneNumber]
        );
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // 💰 Insert transaction
      const result = await sqlite.run(
        `INSERT INTO transactions (phone_number, amount, type, status, reference, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [phoneNumber, new_balance - old_balance, method, status, method]
      );

      console.log('✅ Transaction created with ID:', result.lastID);

      return res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        transactionId: result.lastID
      });

    } catch (error: any) {
      console.error('❌ Create transaction error:', error);
      console.error('❌ Stack:', error?.stack);

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
