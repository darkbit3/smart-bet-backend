import { dbManager } from '../database/databaseManager';

export interface AdminPlayerDepositRequest {
  player_id: number;
  amount: number;
  description?: string;
}

export interface AdminPlayerDepositResponse {
  success: boolean;
  message?: string;
  transaction?: {
    id: number;
    admin_username: string;
    player_id: number;
    transaction_type: string;
    amount: number;
    old_admin_balance: number;
    new_admin_balance: number;
    old_player_balance: number;
    new_player_balance: number;
    reference_id: string;
    description: string;
    status: string;
    created_at: string;
  };
  transaction_id?: string;
}

export class AdminPlayerDepositService {
  static async processDeposit(
    adminUsername: string,
    request: AdminPlayerDepositRequest
  ): Promise<AdminPlayerDepositResponse> {
    const sqlite = dbManager.getSQLite();

    try {
      // Start transaction
      await sqlite.run('BEGIN TRANSACTION');

      try {
        // Get admin user
        const admin = await sqlite.get(
          'SELECT username, balance FROM admin_users WHERE username = ?',
          [adminUsername]
        );

        if (!admin) {
          await sqlite.run('ROLLBACK');
          return {
            success: false,
            message: 'Admin user not found'
          };
        }

        // Get player data
        const player = await sqlite.get('SELECT * FROM players WHERE id = ?', [request.player_id]);
        
        if (!player) {
          await sqlite.run('ROLLBACK');
          return {
            success: false,
            message: 'Player not found.'
          };
        }

        const amount = request.amount;
        const oldAdminBalance = admin.balance;
        const oldPlayerBalance = player.balance;

        // Check admin balance
        if (oldAdminBalance < amount) {
          await sqlite.run('ROLLBACK');
          return {
            success: false,
            message: 'Insufficient admin balance'
          };
        }

        // Update admin balance (decrease)
        const newAdminBalance = oldAdminBalance - amount;
        await sqlite.run(
          'UPDATE admin_users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
          [newAdminBalance, adminUsername]
        );

        // Update player balance (increase)
        const newPlayerBalance = oldPlayerBalance + amount;
        await sqlite.run(
          'UPDATE players SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newPlayerBalance, request.player_id]
        );

        // Generate reference ID
        const referenceId = `PL-DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create admin transaction record
        const adminTransactionResult = await sqlite.run(`
          INSERT INTO admin_transactions (
            admin_username, cashier_username, transaction_type, amount,
            old_admin_balance, new_admin_balance, old_cashier_balance, new_cashier_balance,
            reference_id, description, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
        `, [
          adminUsername, player.phoneNumber || player.phone_number, 'deposit', amount,
          oldAdminBalance, newAdminBalance, 0, 0,
          referenceId, request.description || `Deposit to player ${player.phoneNumber || player.phone_number} (ID: ${player.id})`
        ]);

        // Create player transaction record (using the transactions table)
        await sqlite.run(`
          INSERT INTO transactions (
            phone_number, amount, type, status, reference, created_at
          ) VALUES (?, ?, ?, 'completed', ?, CURRENT_TIMESTAMP)
        `, [
          player.phoneNumber || player.phone_number, amount, 'deposit', referenceId
        ]);

        // Get the created transaction
        const transaction = await sqlite.get(
          'SELECT * FROM admin_transactions WHERE id = ?',
          [adminTransactionResult.lastID]
        );

        // Commit transaction
        await sqlite.run('COMMIT');

        return {
          success: true,
          message: `Successfully deposited $${amount} to player ${player.phoneNumber || player.phone_number}`,
          transaction,
          transaction_id: referenceId
        };

      } catch (error) {
        await sqlite.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Admin player deposit service error:', error);
      return {
        success: false,
        message: 'An error occurred during deposit processing.'
      };
    }
  }

  static async getDepositHistory(
    adminUsername: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    success: boolean;
    data?: any[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    message?: string;
  }> {
    try {
      const sqlite = dbManager.getSQLite();
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await sqlite.get(
        'SELECT COUNT(*) as total FROM admin_transactions WHERE admin_username = ? AND transaction_type = ? AND cashier_username = ?',
        [adminUsername, 'deposit', adminUsername]
      );

      const total = countResult?.total || 0;

      // Get transactions
      const transactions = await sqlite.all(`
        SELECT 
          id, admin_username, cashier_username, amount,
          old_admin_balance, new_admin_balance, reference_id,
          description, created_at
        FROM admin_transactions 
        WHERE admin_username = ? AND transaction_type = ? AND cashier_username = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [adminUsername, 'deposit', adminUsername, limit, offset]);

      return {
        success: true,
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Get deposit history error:', error);
      return {
        success: false,
        message: 'Failed to get deposit history'
      };
    }
  }

  static async getDepositSummary(adminUsername: string): Promise<{
    success: boolean;
    summary?: {
      totalDeposits: number;
      totalAmount: number;
      todayDeposits: number;
      todayAmount: number;
    };
    message?: string;
  }> {
    try {
      const sqlite = dbManager.getSQLite();

      // Get total deposits
      const totalResult = await sqlite.get(`
        SELECT 
          COUNT(*) as totalDeposits,
          COALESCE(SUM(amount), 0) as totalAmount
        FROM admin_transactions 
        WHERE admin_username = ? AND transaction_type = ? AND cashier_username = ?
      `, [adminUsername, 'deposit', adminUsername]);

      // Get today's deposits
      const todayResult = await sqlite.get(`
        SELECT 
          COUNT(*) as todayDeposits,
          COALESCE(SUM(amount), 0) as todayAmount
        FROM admin_transactions 
        WHERE admin_username = ? AND transaction_type = ? AND cashier_username = ?
        AND DATE(created_at) = DATE('now')
      `, [adminUsername, 'deposit', adminUsername]);

      return {
        success: true,
        summary: {
          totalDeposits: totalResult?.totalDeposits || 0,
          totalAmount: totalResult?.totalAmount || 0,
          todayDeposits: todayResult?.todayDeposits || 0,
          todayAmount: todayResult?.todayAmount || 0
        }
      };

    } catch (error) {
      console.error('Get deposit summary error:', error);
      return {
        success: false,
        message: 'Failed to get deposit summary'
      };
    }
  }
}
