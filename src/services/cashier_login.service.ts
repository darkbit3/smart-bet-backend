import { dbManager } from '../database/databaseManager';
import { compare } from 'bcrypt';

export class CashierLoginService {
  static async login(username: string, password: string) {
    try {
      console.log('🔐 Login Service - Attempting login for:', { username, hasPassword: !!password });
      
      // Find cashier by username
      const query = 'SELECT * FROM cashier_users WHERE username = ?';
      const sqlite = dbManager.getSQLite();
      const cashiers = await sqlite.all(query, [username]);
      
      console.log('🔍 Login Service - Found cashiers:', { count: cashiers?.length || 0 });
      
      if (!cashiers || cashiers.length === 0) {
        console.log('❌ Login Service - No cashier found for username:', username);
        return { success: false, message: 'Invalid username or password' };
      }
      
      const cashier = cashiers[0];
      console.log('👤 Login Service - Cashier found:', { 
        id: cashier.id, 
        username: cashier.username, 
        status: cashier.status,
        hasPasswordHash: !!cashier.password_hash 
      });
      
      // Compare password with stored hash
      const isPasswordValid = await compare(password, cashier.password_hash);
      console.log('🔑 Login Service - Password validation:', { isValid: isPasswordValid });
      
      if (!isPasswordValid) {
        console.log('❌ Login Service - Password mismatch for username:', username);
        return { success: false, message: 'Invalid username or password' };
      }
      
      // Check if cashier is active
      if (cashier.status !== 'active') {
        return { success: false, message: 'Account is not active' };
      }
      
      // Remove password hash from response
      const { password_hash, ...cashierData } = cashier;
      
      return {
        success: true,
        message: 'Login successful',
        data: {
          cashier: cashierData
        }
      };
      
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Server error during login' };
    }
  }
}
