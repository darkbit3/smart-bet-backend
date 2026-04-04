import { dbManager } from '../database/databaseManager';

export interface AdminTransaction {
  id: number;
  admin_username: string;
  cashier_username: string;
  transaction_type: string;
  amount: number;
  old_admin_balance: number;
  new_admin_balance: number;
  old_cashier_balance: number;
  new_cashier_balance: number;
  reference_id: string;
  description: string;
  status: string;
  created_at: string;
}

export interface AdminTransactionsResponse {
  success: boolean;
  message?: string;
  data?: {
    transactions: AdminTransaction[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalTransactions: number;
      limit: number;
    };
  };
}

export class AdminTransactionsService {
  /**
   * Get admin transactions with pagination, search, and filtering
   */
  static async getTransactions(
    adminUsername: string,
    page: number = 1,
    limit: number = 20,
    searchTerm: string = '',
    transactionType: string = 'all'
  ): Promise<AdminTransactionsResponse> {
    const sqlite = dbManager.getSQLite();

    try {
      // Calculate offset
      const offset = (page - 1) * limit;

      // Build WHERE clause
      let whereConditions = [];
      let params: any[] = [];

      // Base condition - only show transactions for the current admin
      whereConditions.push('admin_username = ?');
      params.push(adminUsername);

      // Add transaction type filter
      if (transactionType !== 'all') {
        whereConditions.push('transaction_type = ?');
        params.push(transactionType);
      }

      // Add search filter
      if (searchTerm) {
        whereConditions.push('(cashier_username LIKE ? OR description LIKE ? OR reference_id LIKE ?)');
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM admin_transactions 
        ${whereClause}
      `;
      const countResult = await sqlite.get(countQuery, params);
      const totalTransactions = countResult.total;

      // Get transactions with pagination
      const transactionsQuery = `
        SELECT 
          id,
          admin_username,
          cashier_username,
          transaction_type,
          amount,
          old_admin_balance,
          new_admin_balance,
          old_cashier_balance,
          new_cashier_balance,
          reference_id,
          description,
          status,
          created_at
        FROM admin_transactions 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;

      const transactions = await sqlite.all(transactionsQuery, [...params, limit, offset]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalTransactions / limit);

      return {
        success: true,
        data: {
          transactions,
          pagination: {
            currentPage: page,
            totalPages,
            totalTransactions,
            limit
          }
        }
      };

    } catch (error) {
      console.error('Admin transactions service error:', error);
      return {
        success: false,
        message: 'Failed to retrieve transactions'
      };
    }
  }

  /**
   * Get transaction summary statistics
   */
  static async getTransactionSummary(adminUsername: string): Promise<{
    success: boolean;
    data?: {
      totalTransactions: number;
      totalDeposits: number;
      totalWithdrawals: number;
      netFlow: number;
    };
    message?: string;
  }> {
    const sqlite = dbManager.getSQLite();

    try {
      // Get summary stats
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
          SUM(CASE WHEN transaction_type = 'withdraw' THEN amount ELSE 0 END) as total_withdrawals
        FROM admin_transactions 
        WHERE admin_username = ?
      `;

      const result = await sqlite.get(summaryQuery, [adminUsername]);

      return {
        success: true,
        data: {
          totalTransactions: result.total_transactions || 0,
          totalDeposits: result.total_deposits || 0,
          totalWithdrawals: result.total_withdrawals || 0,
          netFlow: (result.total_deposits || 0) - (result.total_withdrawals || 0)
        }
      };

    } catch (error) {
      console.error('Transaction summary error:', error);
      return {
        success: false,
        message: 'Failed to retrieve transaction summary'
      };
    }
  }
}
