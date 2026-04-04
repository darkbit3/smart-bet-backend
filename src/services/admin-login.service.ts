import { dbManager } from '../database/databaseManager';
import bcrypt from 'bcryptjs';

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  created_by: string;
  no_cashier: number;
  no_player: number;
  balance: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export class AdminLoginService {
  // Admin authentication
  static async authenticateAdmin(credentials: AdminLoginRequest): Promise<{ success: boolean; message: string; user?: AdminUser; token?: string }> {
    try {
      console.log('🔍 Auth Service - Input:', { username: credentials.username, passwordLength: credentials.password.length });
      
      const sqlite = dbManager.getSQLite();
      
      // Find admin user by username
      const user = await sqlite.get(
        'SELECT * FROM admin_users WHERE username = ?',
        [credentials.username]
      );
      
      console.log('🔍 Auth Service - Database user:', user ? { username: user.username, status: user.status, hasPassword: !!user.password_hash } : 'null');
      
      if (!user) {
        console.log('❌ Auth Service - User not found:', credentials.username);
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }
      
      // In a real application, you would hash the password and compare
      // Now using bcrypt for secure password verification
      const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash);
      
      console.log('🔍 Auth Service - Password comparison:', { 
        stored: user.password_hash.substring(0, 20) + '...', 
        input: credentials.password,
        match: passwordMatch
      });
      
      if (!passwordMatch) {
        console.log('❌ Auth Service - Password mismatch');
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }
      
      // Check if user is active
      if (user.status !== 'active') {
        console.log('❌ Auth Service - User not active:', user.status);
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }
      
      console.log('✅ Auth Service - Authentication successful, generating token...');
      
      // Generate simple token (in production, use JWT)
      const token = Buffer.from(`${user.username}:${Date.now()}`).toString('base64');
      
      console.log('✅ Auth Service - Token generated:', token.substring(0, 20) + '...');
      
      return {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          password_hash: user.password_hash,
          created_by: user.created_by,
          no_cashier: Number(user.no_cashier || 0),
          no_player: Number(user.no_player || 0),
          balance: user.balance,
          status: user.status,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        token: token
      };
      
    } catch (error) {
      console.error('💥 Auth Service - Error:', error);
      return {
        success: false,
        message: 'Authentication failed'
      };
    }
  }
  
  // Get admin user by token
  static async getAdminByToken(token: string): Promise<AdminUser | null> {
    try {
      // In production, verify JWT token
      // For demo, decode base64 token
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [username] = decoded.split(':');
      
      if (username.length < 2) {
        return null;
      }
      
      const sqlite = dbManager.getSQLite();
      const user = await sqlite.get(
        'SELECT * FROM admin_users WHERE username = ?',
        [username]
      );
      
      return user || null;
    } catch (error) {
      console.error('Error getting admin by token:', error);
      return null;
    }
  }
  
  // Update admin balance
  static async updateAdminBalance(username: string, newBalance: number): Promise<{ success: boolean; message: string }> {
    try {
      const sqlite = dbManager.getSQLite();
      const result = await sqlite.run(
        'UPDATE admin_users SET balance = ?, updated_at = ? WHERE username = ?',
        [newBalance, new Date().toISOString(), username]
      );
      
      if (result.changes > 0) {
        return {
          success: true,
          message: 'Balance updated successfully'
        };
      } else {
        return {
          success: false,
          message: 'Failed to update balance'
        };
      }
    } catch (error) {
      console.error('Error updating admin balance:', error);
      return {
        success: false,
        message: 'Database error occurred'
      };
    }
  }
  
  // Initialize admin users table
  static async initializeAdminTable(): Promise<void> {
    try {
      const sqlite = dbManager.getSQLite() as any;
      
      const createTableSQL = `
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
      `;
      
      await sqlite.run(createTableSQL);
      
      console.log('Admin users table initialized successfully');
    } catch (error) {
      console.error('Error initializing admin users table:', error);
      throw error;
    }
  }
}
