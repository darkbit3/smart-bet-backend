import { dbManager } from '../database/databaseManager';

export class CashierProfileService {
  static async getProfile(cashierId: number) {
    try {
      // Get cashier profile from database
      const query = 'SELECT id, username, number_of_players, balance, status, created_at, updated_at FROM cashier_users WHERE id = ?';
      const sqlite = dbManager.getSQLite();
      const cashiers = await sqlite.all(query, [cashierId]);
      
      if (!cashiers || cashiers.length === 0) {
        return { success: false, message: 'Cashier not found' };
      }
      
      const cashier = cashiers[0];
      
      return {
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          cashier: cashier
        }
      };
      
    } catch (error) {
      console.error('Profile service error:', error);
      return { success: false, message: 'Server error retrieving profile' };
    }
  }
}
