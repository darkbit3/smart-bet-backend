import { dbManager } from '../database/databaseManager';

export interface AdminBalanceResponse {
  success: boolean;
  balance?: number;
  message?: string;
  last_updated?: string;
}

export class AdminBalanceService {
  // Get current admin balance
  static async getAdminBalance(adminUsername: string): Promise<AdminBalanceResponse> {
    try {
      const sqlite = dbManager.getSQLite();
      
      const result = await sqlite.get(
        'SELECT balance, updated_at FROM admin_users WHERE username = ?',
        [adminUsername]
      );
      
      if (!result) {
        return {
          success: false,
          message: 'Admin user not found'
        };
      }
      
      return {
        success: true,
        balance: result.balance,
        last_updated: result.updated_at
      };
      
    } catch (error) {
      console.error('Error getting admin balance:', error);
      return {
        success: false,
        message: 'Failed to get admin balance'
      };
    }
  }
  
  // Update admin balance
  static async updateAdminBalance(adminUsername: string, newBalance: number): Promise<AdminBalanceResponse> {
    try {
      const sqlite = dbManager.getSQLite();
      
      // Start transaction
      await sqlite.run('BEGIN TRANSACTION');
      
      try {
        // Get current balance for logging
        const currentResult = await sqlite.get(
          'SELECT balance FROM admin_users WHERE username = ?',
          [adminUsername]
        );
        
        if (!currentResult) {
          await sqlite.run('ROLLBACK');
          return {
            success: false,
            message: 'Admin user not found'
          };
        }
        
        const oldBalance = currentResult.balance;
        
        // Update balance
        await sqlite.run(
          'UPDATE admin_users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
          [newBalance, adminUsername]
        );
        
        // Log balance change
        await sqlite.run(`
          INSERT INTO admin_transactions (
            admin_username, cashier_username, transaction_type, amount,
            old_admin_balance, new_admin_balance, old_cashier_balance, new_cashier_balance,
            reference_id, description, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
        `, [
          adminUsername, 'SYSTEM', 'balance_adjustment', newBalance - oldBalance,
          oldBalance, newBalance, 0, 0,
          `BAL-${Date.now()}`, 'Balance adjustment via admin panel'
        ]);
        
        // Commit transaction
        await sqlite.run('COMMIT');
        
        return {
          success: true,
          balance: newBalance,
          message: 'Balance updated successfully'
        };
        
      } catch (error) {
        await sqlite.run('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Error updating admin balance:', error);
      return {
        success: false,
        message: 'Failed to update admin balance'
      };
    }
  }
  
  // Get balance history
  static async getBalanceHistory(adminUsername: string, limit: number = 10): Promise<{
    success: boolean;
    data?: any[];
    message?: string;
  }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      const transactions = await sqlite.all(`
        SELECT 
          transaction_type,
          amount,
          old_admin_balance,
          new_admin_balance,
          description,
          created_at,
          reference_id
        FROM admin_transactions 
        WHERE admin_username = ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [adminUsername, limit]);
      
      return {
        success: true,
        data: transactions
      };
      
    } catch (error) {
      console.error('Error getting balance history:', error);
      return {
        success: false,
        message: 'Failed to get balance history'
      };
    }
  }
}
