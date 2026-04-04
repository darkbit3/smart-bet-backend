import { dbManager } from '../database/databaseManager';
import { AdminUsersService } from './admin-users.service';
import { AdminCashierDepositRequest, AdminTransactionResponse, AdminTransaction } from '../models/admin_transaction.model';
import { generateReferenceId } from '../utils/referenceGenerator';

export class AdminCashierDepositService {
  /**
   * Process deposit from admin to cashier
   */
  static async processDeposit(request: AdminCashierDepositRequest, adminUsername: string): Promise<AdminTransactionResponse> {
    const sqlite = dbManager.getSQLite();
    
    try {
      console.log('Processing cashier deposit:', { cashier_username: request.cashier_username, amount: request.amount });
      
      // Start transaction
      await sqlite.run('BEGIN TRANSACTION');

      // Validate input
      if (!request.cashier_username || !request.amount || request.amount <= 0) {
        await sqlite.run('ROLLBACK');
        return {
          success: false,
          message: 'Invalid deposit request. Cashier username and positive amount are required.'
        };
      }

      // Get admin details
      const admin = await AdminUsersService.getAdminUserByUsername(adminUsername);
      console.log('Admin found:', admin);
      if (!admin) {
        await sqlite.run('ROLLBACK');
        return {
          success: false,
          message: 'Admin user not found.'
        };
      }

      // Get cashier details
      const cashier = await sqlite.get(
        'SELECT * FROM cashier_users WHERE username = ?',
        [request.cashier_username]
      );

      console.log('Cashier found in database:', cashier);

      if (!cashier) {
        await sqlite.run('ROLLBACK');
        return {
          success: false,
          message: 'Cashier not found.'
        };
      }

      // Calculate new balances
      const oldAdminBalance = Number(admin.balance || 0);
      const oldCashierBalance = Number(cashier.balance || 0);
      const newAdminBalance = oldAdminBalance - request.amount;
      const newCashierBalance = oldCashierBalance + request.amount;

      console.log('Balances:', { oldAdminBalance, oldCashierBalance, newAdminBalance, newCashierBalance });

      // Check admin balance
      if (newAdminBalance < 0) {
        await sqlite.run('ROLLBACK');
        return {
          success: false,
          message: 'Insufficient admin balance.'
        };
      }

      // Generate reference ID
      const referenceId = generateReferenceId('DEP');

      // Update admin balance
      console.log('Updating admin balance to:', newAdminBalance);
      await sqlite.run(
        'UPDATE admin_users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
        [newAdminBalance, adminUsername]
      );

      // Update cashier balance
      console.log('Updating cashier balance to:', newCashierBalance);
      await sqlite.run(
        'UPDATE cashier_users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
        [newCashierBalance, request.cashier_username]
      );

      // Create admin transaction record
      console.log('Creating admin transaction record');
      const transactionResult = await sqlite.run(`
        INSERT INTO admin_transactions (
          admin_username, cashier_username, transaction_type, amount,
          old_admin_balance, new_admin_balance, old_cashier_balance, new_cashier_balance,
          reference_id, description, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
      `, [
        adminUsername, request.cashier_username, 'deposit', request.amount,
        oldAdminBalance, newAdminBalance, oldCashierBalance, newCashierBalance,
        referenceId, request.description || `Deposit to ${request.cashier_username}`
      ]);

      console.log('Admin transaction created with ID:', transactionResult.lastID);

      // Create cashier transaction record (system operation)
      console.log('Creating cashier transaction record');
      await sqlite.run(`
        INSERT INTO cashier_transactions (
          cashier_id, player_phone_number, status,
          old_cashier_balance, new_cashier_balance
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        cashier.id, 'admin_deposit', 'deposit',
        oldCashierBalance, newCashierBalance
      ]);

      // Get the created transaction
      const transaction = await sqlite.get(
        'SELECT * FROM admin_transactions WHERE id = ?',
        [transactionResult.lastID]
      );

      console.log('Final transaction:', transaction);

      // Commit transaction
      await sqlite.run('COMMIT');
      console.log('Transaction committed successfully');

      return {
        success: true,
        message: `Successfully deposited $${request.amount.toLocaleString()} to ${request.cashier_username}`,
        transaction: transaction as AdminTransaction,
        transaction_id: referenceId
      };

    } catch (error) {
      await sqlite.run('ROLLBACK');
      console.error('Deposit service error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return {
        success: false,
        message: `Deposit processing error: ${error.message || 'Unknown error occurred'}`
      };
    }
  }

  /**
   * Get deposit history for admin
   */
  static async getDepositHistory(adminUsername: string, limit: number = 50, offset: number = 0): Promise<AdminTransaction[]> {
    try {
      const sqlite = dbManager.getSQLite();
      const transactions = await sqlite.all(`
        SELECT * FROM admin_transactions 
        WHERE admin_username = ? AND transaction_type = 'deposit'
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [adminUsername, limit, offset]);

      return transactions.map((t: any) => ({
        ...t,
        amount: Number(t.amount),
        old_admin_balance: Number(t.old_admin_balance),
        new_admin_balance: Number(t.new_admin_balance),
        old_cashier_balance: Number(t.old_cashier_balance),
        new_cashier_balance: Number(t.new_cashier_balance)
      })) as AdminTransaction[];
    } catch (error) {
      console.error('Error getting deposit history:', error);
      return [];
    }
  }

  /**
   * Get transaction summary for admin
   */
  static async getTransactionSummary(adminUsername: string): Promise<any> {
    try {
      const sqlite = dbManager.getSQLite();
      
      const summary = await sqlite.get(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
          SUM(CASE WHEN transaction_type = 'withdraw' THEN amount ELSE 0 END) as total_withdrawals,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_transactions,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_transactions
        FROM admin_transactions 
        WHERE admin_username = ?
      `, [adminUsername]);

      return {
        ...summary,
        total_deposits: Number(summary.total_deposits || 0),
        total_withdrawals: Number(summary.total_withdrawals || 0),
        net_amount: Number(summary.total_deposits || 0) - Number(summary.total_withdrawals || 0),
        transaction_count: Number(summary.total_transactions || 0),
        successful_transactions: Number(summary.successful_transactions || 0),
        failed_transactions: Number(summary.failed_transactions || 0)
      };
    } catch (error) {
      console.error('Error getting transaction summary:', error);
      return {
        total_deposits: 0,
        total_withdrawals: 0,
        net_amount: 0,
        transaction_count: 0,
        successful_transactions: 0,
        failed_transactions: 0
      };
    }
  }
}
