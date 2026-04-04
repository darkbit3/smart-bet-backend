/**
 * SQLite Cashier User interface
 */
export interface CashierUser {
  id: number;
  username: string;
  password_hash?: string;
  created_by: string;
  number_of_players: number;
  balance: number;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

/**
 * Cashier User Request interfaces
 */
export interface CreateCashierUserRequest {
  username: string;
  password: string;
  confirm_password?: string;
  created_by: string;
  initial_balance?: number;
}

export interface CashierLoginRequest {
  username: string;
  password: string;
}

export interface CashierAuthResponse {
  cashier_user: Omit<CashierUser, 'password_hash'>;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface UpdateCashierUserRequest {
  username?: string;
  balance?: number;
  number_of_players?: number;
  status?: 'active' | 'inactive' | 'suspended';
}
