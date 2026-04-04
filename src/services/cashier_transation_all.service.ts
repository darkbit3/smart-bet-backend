import { dbManager } from '../database/databaseManager';

export class CashierTransactionAllService {
  static async getAllTransactions(cashierUsername: string) {
    try {
      // First get cashier ID from username
      const cashierQuery = 'SELECT id, username FROM cashier_users WHERE username = ?';
      const sqlite = dbManager.getSQLite();
      const cashier = await sqlite.get(cashierQuery, [cashierUsername]);
      
      if (!cashier) {
        return { success: false, message: 'Cashier user not found' };
      }

      // Get all transactions for this cashier with player and cashier names
      const transactionsQuery = `
        SELECT 
          ct.id,
          ct.cashier_id,
          ct.player_id,
          ct.transaction_type,
          ct.amount,
          ct.balance_before,
          ct.balance_after,
          ct.status,
          ct.created_at,
          cu.username as cashier_name,
          p.username as player_name
        FROM cashier_transactions ct
        LEFT JOIN cashier_users cu ON ct.cashier_id = cu.id
        LEFT JOIN players p ON ct.player_id = p.id
        WHERE ct.cashier_id = ?
        ORDER BY ct.created_at DESC
      `;
      
      const transactions = await sqlite.all(transactionsQuery, [cashier.id]);
      
      return {
        success: true,
        data: {
          transactions: transactions.map((t: any) => ({
            ...t,
            id: t.id.toString()
          }))
        }
      };
      
    } catch (error) {
      console.error('Error fetching all transactions:', error);
      return { success: false, message: 'Server error while fetching transactions' };
    }
  }

  static async getDepositTransactions(cashierUsername: string) {
    try {
      // First get cashier ID from username
      const cashierQuery = 'SELECT id, username FROM cashier_users WHERE username = ?';
      const sqlite = dbManager.getSQLite();
      const cashier = await sqlite.get(cashierQuery, [cashierUsername]);
      
      if (!cashier) {
        return { success: false, message: 'Cashier user not found' };
      }

      // Get deposit transactions for this cashier with player and cashier names
      const transactionsQuery = `
        SELECT 
          ct.id,
          ct.cashier_id,
          ct.player_id,
          ct.transaction_type,
          ct.amount,
          ct.balance_before,
          ct.balance_after,
          ct.status,
          ct.created_at,
          cu.username as cashier_name,
          p.username as player_name
        FROM cashier_transactions ct
        LEFT JOIN cashier_users cu ON ct.cashier_id = cu.id
        LEFT JOIN players p ON ct.player_id = p.id
        WHERE ct.cashier_id = ? AND ct.transaction_type = 'deposit'
        ORDER BY ct.created_at DESC
      `;
      
      const transactions = await sqlite.all(transactionsQuery, [cashier.id]);
      
      return {
        success: true,
        data: {
          transactions: transactions.map((t: any) => ({
            ...t,
            id: t.id.toString()
          }))
        }
      };
      
    } catch (error) {
      console.error('Error fetching deposit transactions:', error);
      return { success: false, message: 'Server error while fetching deposit transactions' };
    }
  }

  static async getWithdrawTransactions(cashierUsername: string) {
    try {
      // First get cashier ID from username
      const cashierQuery = 'SELECT id, username FROM cashier_users WHERE username = ?';
      const sqlite = dbManager.getSQLite();
      const cashier = await sqlite.get(cashierQuery, [cashierUsername]);
      
      if (!cashier) {
        return { success: false, message: 'Cashier user not found' };
      }

      // Get withdraw transactions for this cashier with player and cashier names
      const transactionsQuery = `
        SELECT 
          ct.id,
          ct.cashier_id,
          ct.player_id,
          ct.transaction_type,
          ct.amount,
          ct.balance_before,
          ct.balance_after,
          ct.status,
          ct.created_at,
          cu.username as cashier_name,
          p.username as player_name
        FROM cashier_transactions ct
        LEFT JOIN cashier_users cu ON ct.cashier_id = cu.id
        LEFT JOIN players p ON ct.player_id = p.id
        WHERE ct.cashier_id = ? AND ct.transaction_type = 'withdraw'
        ORDER BY ct.created_at DESC
      `;
      
      const transactions = await sqlite.all(transactionsQuery, [cashier.id]);
      
      return {
        success: true,
        data: {
          transactions: transactions.map((t: any) => ({
            ...t,
            id: t.id.toString()
          }))
        }
      };
      
    } catch (error) {
      console.error('Error fetching withdraw transactions:', error);
      return { success: false, message: 'Server error while fetching withdraw transactions' };
    }
  }
}
