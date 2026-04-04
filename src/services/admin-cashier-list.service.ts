import { dbManager } from '../database/databaseManager';

export interface CashierUser {
  id: number;
  username: string;
  password_hash: string;
  created_by: string;
  number_of_players: number;
  balance: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GetCashiersRequest {
  created_by?: string;
  username?: string;
  status?: string;
}

export class AdminCashierListService {
  // Get cashiers by admin username
  static async getCashiersByAdmin(request: GetCashiersRequest): Promise<{ success: boolean; message: string; cashiers?: CashierUser[] }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      let query = 'SELECT * FROM cashier_users';
      const params: any[] = [];
      
      if (request.created_by || request.username || request.status) {
        query += ' WHERE';
        const conditions: string[] = [];
        
        if (request.created_by) {
          conditions.push(' created_by = ?');
          params.push(request.created_by);
        }
        
        if (request.username) {
          if (conditions.length > 0) conditions.push(' AND');
          conditions.push(' username LIKE ?');
          params.push(`%${request.username}%`);
        }
        
        if (request.status) {
          if (conditions.length > 0) conditions.push(' AND');
          conditions.push(' status = ?');
          params.push(request.status);
        }
        
        query += conditions.join('');
      }
      
      query += ' ORDER BY created_at DESC';
      
      const cashiers = await sqlite.all(query, params);
      
      return {
        success: true,
        message: 'Cashiers retrieved successfully',
        cashiers
      };
      
    } catch (error) {
      console.error('Get cashiers error:', error);
      return {
        success: false,
        message: 'Database error occurred'
      };
    }
  }
  
  // Initialize cashier table if not exists
  static async initializeCashierTable(): Promise<void> {
    try {
      const sqlite = dbManager.getSQLite();
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS cashier_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_by VARCHAR(50) NOT NULL,
          number_of_players INTEGER DEFAULT 0,
          balance DECIMAL(15,2) DEFAULT 0.00,
          status VARCHAR(20) DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await sqlite.run(createTableSQL);
      
      console.log('Cashier users table initialized successfully');
    } catch (error) {
      console.error('Error initializing cashier users table:', error);
      throw error;
    }
  }
}
