/**
 * Admin Transaction interfaces for admin-cashier operations
 */
export interface AdminTransaction {
  id: number;
  admin_username: string;
  cashier_username: string;
  transaction_type: 'deposit' | 'withdraw';
  amount: number;
  old_admin_balance: number;
  new_admin_balance: number;
  old_cashier_balance: number;
  new_cashier_balance: number;
  reference_id?: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

/**
 * Admin Transaction Request interfaces
 */
export interface AdminCashierDepositRequest {
  cashier_username: string;
  amount: number;
  description?: string;
}

export interface AdminCashierWithdrawRequest {
  cashier_username: string;
  amount: number;
  description?: string;
}

/**
 * Admin Transaction Response interfaces
 */
export interface AdminTransactionResponse {
  success: boolean;
  message: string;
  transaction?: AdminTransaction;
  transaction_id?: string;
}

/**
 * Transaction History Request
 */
export interface AdminTransactionHistoryRequest {
  admin_username?: string;
  cashier_username?: string;
  transaction_type?: 'deposit' | 'withdraw';
  status?: 'pending' | 'completed' | 'failed';
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Transaction Summary
 */
export interface AdminTransactionSummary {
  total_deposits: number;
  total_withdrawals: number;
  net_amount: number;
  transaction_count: number;
  successful_transactions: number;
  failed_transactions: number;
}
