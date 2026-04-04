import { dbManager } from '../database/databaseManager';
import { compare, hash } from 'bcrypt';

export class CashierPasswordService {
  static async changePassword(cashierId: number, currentPassword: string, newPassword: string) {
    try {
      // Get current cashier data
      const query = 'SELECT password_hash FROM cashier_users WHERE id = ?';
      const sqlite = dbManager.getSQLite();
      const cashiers = await sqlite.all(query, [cashierId]);
      
      if (!cashiers || cashiers.length === 0) {
        return { success: false, message: 'Cashier not found' };
      }
      
      const cashier = cashiers[0];
      
      // Verify current password
      const isCurrentPasswordValid = await compare(currentPassword, cashier.password_hash);
      
      if (!isCurrentPasswordValid) {
        return { success: false, message: 'Current password is incorrect' };
      }
      
      // Hash new password
      const hashedNewPassword = await hash(newPassword, 10);
      
      // Update password in database
      const updateQuery = 'UPDATE cashier_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      await sqlite.run(updateQuery, [hashedNewPassword, cashierId]);
      
      return {
        success: true,
        message: 'Password changed successfully'
      };
      
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, message: 'Server error during password change' };
    }
  }
}
