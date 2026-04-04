import { dbManager } from '../database/databaseManager';

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  created_by: string;
  no_cashier: number; // total cashiers under this admin
  no_player: number;  // total players under this admin
  balance: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export class AdminUsersService {
  // Recalculate and update admin counts (cashiers and players)
  static async updateAdminCounts(adminUsername: string): Promise<void> {
    try {
      const sqlite = dbManager.getSQLite();

      const cashierCountRow: any = await sqlite.get(
        'SELECT COUNT(*) AS count FROM cashier_users WHERE created_by = ?',
        [adminUsername]
      );
      const cashierCount = cashierCountRow ? Number(cashierCountRow.count || 0) : 0;

      const playerCountRow: any = await sqlite.get(
        `SELECT COUNT(*) AS count
         FROM players p
         LEFT JOIN cashier_users c ON p.created_by = c.username
         WHERE p.created_by = ? OR c.created_by = ?`,
        [adminUsername, adminUsername]
      );
      const playerCount = playerCountRow ? Number(playerCountRow.count || 0) : 0;

      await sqlite.run(
        'UPDATE admin_users SET no_cashier = ?, no_player = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
        [cashierCount, playerCount, adminUsername]
      );
    } catch (error) {
      console.error('Error updating admin counts:', error);
      // do not throw; it's non-fatal
    }
  }

  // Create new admin user
  static async createAdminUser(userData: Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; message: string; user?: AdminUser }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      // Check if username already exists
      const existingUser = await sqlite.get(
        'SELECT id FROM admin_users WHERE username = ?',
        [userData.username]
      );
      
      if (existingUser) {
        return {
          success: false,
          message: 'Username already exists'
        };
      }
      
      // Insert new admin user
      const result = await sqlite.run(
        `INSERT INTO admin_users (
          username, password_hash, created_by, no_cashier, no_player, balance, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.username,
          userData.password_hash,
          userData.created_by,
          Number(userData.no_cashier || 0),
          Number(userData.no_player || 0),
          userData.balance || 0,
          userData.status || 'active'
        ]
      );
      
      if (result.changes > 0) {
        return {
          success: true,
          message: 'Admin user created successfully',
          user: {
            id: result.lastID,
            username: userData.username,
            password_hash: userData.password_hash,
            created_by: userData.created_by,
            no_cashier: Number(userData.no_cashier || 0),
            no_player: Number(userData.no_player || 0),
            balance: userData.balance,
            status: userData.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };
      } else {
        return {
          success: false,
          message: 'Failed to create admin user'
        };
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
      return {
        success: false,
        message: 'Database error occurred'
      };
    }
  }
  
  // Get admin user by username
  static async getAdminUserByUsername(username: string): Promise<AdminUser | null> {
    try {
      const sqlite = dbManager.getSQLite();
      const user = await sqlite.get(
        'SELECT * FROM admin_users WHERE username = ?',
        [username]
      );
      if (user) {
        user.no_cashier = Number(user.no_cashier || 0);
        user.no_player = Number(user.no_player || 0);
      }
      return user || null;
    } catch (error) {
      console.error('Error getting admin user:', error);
      return null;
    }
  }
  
  // Get all admin users
  static async getAllAdminUsers(): Promise<AdminUser[]> {
    try {
      const sqlite = dbManager.getSQLite();
      const users = await sqlite.all(
        'SELECT * FROM admin_users ORDER BY created_at DESC'
      );
      return users.map((user: any) => ({
        ...user,
        no_cashier: Number(user.no_cashier || 0),
        no_player: Number(user.no_player || 0)
      }));
    } catch (error) {
      console.error('Error getting all admin users:', error);
      return [];
    }
  }
  
  // Update admin user
  static async updateAdminUser(id: number, updates: Partial<AdminUser>): Promise<{ success: boolean; message: string }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      // Build dynamic update query
      const updateFields = Object.keys(updates).filter(key => key !== 'id').map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updates).filter(value => value !== undefined);
      
      if (updateFields.length === 0) {
        return {
          success: false,
          message: 'No fields to update'
        };
      }
      
      const result = await sqlite.run(
        `UPDATE admin_users SET ${updateFields}, updated_at = ? WHERE id = ?`,
        [...updateValues, new Date().toISOString(), id]
      );
      
      if (result.changes > 0) {
        return {
          success: true,
          message: 'Admin user updated successfully'
        };
      } else {
        return {
          success: false,
          message: 'Admin user not found or no changes made'
        };
      }
    } catch (error) {
      console.error('Error updating admin user:', error);
      return {
        success: false,
        message: 'Database error occurred'
      };
    }
  }
  
  // Delete admin user
  static async deleteAdminUser(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const sqlite = dbManager.getSQLite();
      const result = await sqlite.run(
        'DELETE FROM admin_users WHERE id = ?',
        [id]
      );
      
      if (result.changes > 0) {
        return {
          success: true,
          message: 'Admin user deleted successfully'
        };
      } else {
        return {
          success: false,
          message: 'Admin user not found'
        };
      }
    } catch (error) {
      console.error('Error deleting admin user:', error);
      return {
        success: false,
        message: 'Database error occurred'
      };
    }
  }
  
  // Recalculate all admin counts for data integrity
  static async refreshAllAdminCounts(): Promise<void> {
    try {
      const sqlite = dbManager.getSQLite();
      const admins: any[] = await sqlite.all('SELECT username FROM admin_users');

      for (const admin of admins) {
        if (admin.username) {
          await this.updateAdminCounts(admin.username);
        }
      }
    } catch (error) {
      console.error('Error refreshing all admin counts:', error);
    }
  }

  // Initialize the table
  static async initializeTable(): Promise<void> {
    try {
      const sqlite = dbManager.getSQLite();
      
      // Create table if it doesn't exist
      await sqlite.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_by TEXT NOT NULL,
          no_cashier BOOLEAN DEFAULT 0,
          no_player BOOLEAN DEFAULT 0,
          balance REAL DEFAULT 0.0,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Admin users table initialized successfully');
    } catch (error) {
      console.error('Error initializing admin users table:', error);
      throw error;
    }
  }
}
