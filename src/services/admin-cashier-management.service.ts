import { dbManager } from '../database/databaseManager';
import { AdminUsersService } from './admin-users.service';

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

export interface CreateCashierRequest {
  username: string;
  password: string;
  created_by: string;
}

export interface SearchCashierRequest {
  username?: string;
  created_by?: string;
}

export interface UpdateCashierRequest {
  username?: string;
  password?: string;
  status?: string;
  balance?: number;
}

export interface WithdrawRequest {
  username: string;
  amount: number;
  description?: string;
}

export class AdminCashierManagementService {
  // Create new cashier
  static async createCashier(cashierData: CreateCashierRequest): Promise<{ success: boolean; message: string; cashier?: CashierUser }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      // Check if username already exists
      const existingCashier = await sqlite.get(
        'SELECT username FROM cashier_users WHERE username = ?',
        [cashierData.username]
      );
      
      if (existingCashier) {
        return {
          success: false,
          message: 'Username already exists'
        };
      }
      
      // Hash password (in production, use proper hashing)
      const passwordHash = `$2b$10$${cashierData.password}hash`; // Simple hash for demo
      
      // Insert new cashier
      const result = await sqlite.run(
        `INSERT INTO cashier_users (
          username, password_hash, created_by, number_of_players, balance, status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          cashierData.username,
          passwordHash,
          cashierData.created_by,
          0,
          0.00,
          'active'
        ]
      );
      
      if (result.lastID) {
        // Recalculate counts for admin who created this cashier
        await AdminUsersService.updateAdminCounts(cashierData.created_by);

        // Get the created cashier
        const newCashier = await sqlite.get(
          'SELECT * FROM cashier_users WHERE id = ?',
          [result.lastID]
        );
        
        return {
          success: true,
          message: 'Cashier created successfully',
          cashier: newCashier
        };
      }
      
      return {
        success: false,
        message: 'Failed to create cashier'
      };
      
    } catch (error) {
      console.error('Create cashier error:', error);
      return {
        success: false,
        message: 'Database error occurred'
      };
    }
  }

  // Recalculate a cashier's number_of_players from players table
  static async refreshCashierPlayerCount(cashierUsername: string): Promise<number> {
    try {
      const sqlite = dbManager.getSQLite();
      const countRow: any = await sqlite.get(
        'SELECT COUNT(*) AS count FROM players WHERE created_by = ?',
        [cashierUsername]
      );
      const count = Number(countRow?.count || 0);

      await sqlite.run(
        'UPDATE cashier_users SET number_of_players = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
        [count, cashierUsername]
      );

      return count;
    } catch (error) {
      console.error('Error refreshing cashier player count:', error);
      return 0;
    }
  }

  // Increment cashier player count by 1
  static async incrementCashierPlayerCount(cashierUsername: string): Promise<void> {
    try {
      const sqlite = dbManager.getSQLite();
      await sqlite.run(
        'UPDATE cashier_users SET number_of_players = COALESCE(number_of_players, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
        [cashierUsername]
      );
    } catch (error) {
      console.error('Error incrementing cashier player count:', error);
    }
  }
  
  // Delete cashier
  static async deleteCashier(username: string): Promise<{ success: boolean; message: string }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      // Check if cashier exists
      const existingCashier = await sqlite.get(
        'SELECT username FROM cashier_users WHERE username = ?',
        [username]
      );
      
      if (!existingCashier) {
        return {
          success: false,
          message: 'Cashier not found'
        };
      }
      
      // Delete cashier
      const result = await sqlite.run(
        'DELETE FROM cashier_users WHERE username = ?',
        [username]
      );
      
      if (result.changes > 0) {
        return {
          success: true,
          message: 'Cashier deleted successfully'
        };
      }
      
      return {
        success: false,
        message: 'Failed to delete cashier'
      };
      
    } catch (error) {
      console.error('Delete cashier error:', error);
      return {
        success: false,
        message: 'Database error occurred'
      };
    }
  }
  
  // Update cashier
  static async updateCashier(username: string, updateData: UpdateCashierRequest): Promise<{ success: boolean; message: string; cashier?: CashierUser }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      // Check if cashier exists
      const existingCashier = await sqlite.get(
        'SELECT username FROM cashier_users WHERE username = ?',
        [username]
      );
      
      if (!existingCashier) {
        return {
          success: false,
          message: 'Cashier not found'
        };
      }
      
      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (updateData.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(updateData.status);
      }
      
      if (updateData.balance !== undefined) {
        updateFields.push('balance = ?');
        updateValues.push(updateData.balance);
      }
      
      if (updateData.password !== undefined) {
        updateFields.push('password_hash = ?');
        const passwordHash = `$2b$10$${updateData.password}hash`;
        updateValues.push(passwordHash);
      }
      
      const setClause = updateFields.join(', ');
      const result = await sqlite.run(
        `UPDATE cashier_users SET ${setClause} WHERE username = ?`,
        [...updateValues, username]
      );
      
      if (result.changes > 0) {
        // Get updated cashier
        const updatedCashier = await sqlite.get(
          'SELECT * FROM cashier_users WHERE username = ?',
          [username]
        );
        
        return {
          success: true,
          message: 'Cashier updated successfully',
          cashier: updatedCashier
        };
      }
      
      return {
        success: false,
        message: 'Failed to update cashier'
      };
      
    } catch (error) {
      console.error('Update cashier error:', error);
      return {
        success: false,
        message: 'Database error occurred'
      };
    }
  }
  
  // Block/Unblock cashier
  static async toggleCashierStatus(username: string): Promise<{ success: boolean; message: string }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      // Get current status
      const currentCashier = await sqlite.get(
        'SELECT status FROM cashier_users WHERE username = ?',
        [username]
      );
      
      if (!currentCashier) {
        return {
          success: false,
          message: 'Cashier not found'
        };
      }
      
      const newStatus = currentCashier.status === 'active' ? 'blocked' : 'active';
      
      const result = await sqlite.run(
        'UPDATE cashier_users SET status = ? WHERE username = ?',
        [newStatus, username]
      );
      
      if (result.changes > 0) {
        return {
          success: true,
          message: `Cashier ${newStatus} successfully`
        };
      }
      
      return {
        success: false,
        message: 'Failed to update cashier status'
      };
      
    } catch (error) {
      console.error('Toggle cashier status error:', error);
      return {
        success: false,
        message: 'Database error occurred'
      };
    }
  }
  
  // Withdraw from cashier
  static async withdrawFromCashier(withdrawData: WithdrawRequest): Promise<{ success: boolean; message: string }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      // Get current cashier
      const currentCashier = await sqlite.get(
        'SELECT * FROM cashier_users WHERE username = ?',
        [withdrawData.username]
      );
      
      if (!currentCashier) {
        return {
          success: false,
          message: 'Cashier not found'
        };
      }
      
      // Check if sufficient balance
      if (currentCashier.balance < withdrawData.amount) {
        return {
          success: false,
          message: 'Insufficient balance'
        };
      }
      
      // Update cashier balance
      const newBalance = currentCashier.balance - withdrawData.amount;
      
      const result = await sqlite.run(
        'UPDATE cashier_users SET balance = ?, updated_at = ? WHERE username = ?',
        [newBalance, new Date().toISOString(), withdrawData.username]
      );
      
      if (result.changes > 0) {
        return {
          success: true,
          message: `Withdrawal of ${withdrawData.amount} successful`
        };
      }
      
      return {
        success: false,
        message: 'Failed to process withdrawal'
      };
      
    } catch (error) {
      console.error('Withdraw error:', error);
      return {
        success: false,
        message: 'Database error occurred'
      };
    }
  }
  
  // Refresh all cashier player counts
  static async refreshAllCashierPlayerCounts(): Promise<void> {
    try {
      const sqlite = dbManager.getSQLite();
      const cashiers: any[] = await sqlite.all('SELECT username FROM cashier_users');

      for (const cashier of cashiers) {
        if (cashier.username) {
          await this.refreshCashierPlayerCount(cashier.username);
        }
      }
    } catch (error) {
      console.error('Error refreshing all cashier player counts:', error);
    }
  }

  // Search cashiers by username
  static async searchCashiers(searchData: SearchCashierRequest): Promise<{ success: boolean; message: string; cashiers?: CashierUser[] }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      let query = 'SELECT * FROM cashier_users';
      const params: any[] = [];
      
      if (searchData.username || searchData.created_by) {
        query += ' WHERE';
        const conditions: string[] = [];
        
        if (searchData.username) {
          conditions.push(' username LIKE ?');
          params.push(`%${searchData.username}%`);
        }
        
        if (searchData.created_by) {
          if (conditions.length > 0) conditions.push(' AND');
          conditions.push(' created_by = ?');
          params.push(searchData.created_by);
        }
        
        query += conditions.join('');
      }
      
      const cashiers = await sqlite.all(query, params);
      
      return {
        success: true,
        message: 'Cashiers retrieved successfully',
        cashiers
      };
      
    } catch (error) {
      console.error('Search cashiers error:', error);
      return {
        success: false,
        message: 'Database error occurred'
      };
    }
  }
  
  // Check if username exists
  static async checkUsernameExists(username: string): Promise<{ success: boolean; message: string; exists: boolean }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      const existingUser = await sqlite.get(
        'SELECT username FROM cashier_users WHERE username = ?',
        [username]
      );
      
      return {
        success: true,
        message: 'Username check completed',
        exists: !!existingUser
      };
      
    } catch (error) {
      console.error('Username check error:', error);
      return {
        success: false,
        message: 'Database error occurred',
        exists: false
      };
    }
  }
  
  // Initialize cashier_users table if not exists
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

  // Get cashier by username
  static async getCashierByUsername(username: string): Promise<{ success: boolean; cashier?: CashierUser; message: string }> {
    try {
      const sqlite = dbManager.getSQLite();
      const trimmedUsername = username.trim();
      
      console.log('Looking for cashier with username:', trimmedUsername);
      
      const cashier = await sqlite.get(
        'SELECT id, username, password_hash, created_by, number_of_players, balance, status, created_at, updated_at FROM cashier_users WHERE username = ?',
        [trimmedUsername]
      );

      console.log('Found cashier:', cashier);

      if (cashier) {
        return {
          success: true,
          cashier: cashier,
          message: 'Cashier found successfully'
        };
      } else {
        console.log('No cashier found for username:', trimmedUsername);
        return {
          success: false,
          message: 'Cashier with this username not found'
        };
      }
    } catch (error) {
      console.error('Error getting cashier by username:', error);
      return {
        success: false,
        message: 'Failed to retrieve cashier'
      };
    }
  }
}
