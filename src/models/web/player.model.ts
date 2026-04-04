/**
 * SQLite Player interface
 * (This is ONLY a type — not a database model like Mongoose)
 */
export interface Player {
  id: number;
  username: string;
  phone_number: string;
  password_hash?: string;
  last_password_change: string;
  balance: number;
  withdrawable: number;
  non_withdrawable: number;
  bonus_balance: number;
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request interfaces
 */
export interface CreatePlayerRequest {
  username: string;
  phone_number: string;
  password: string;
  confirm_password?: string;
  created_by?: string;
  referral_code?: string;
}

export interface LoginRequest {
  phone_number: string;
  password: string;
}

export interface AuthResponse {
  player: Player;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}