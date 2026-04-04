import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { dbManager } from '../database/databaseManager';
import { AuthenticatedRequest } from '../middleware/authenticate';

export class PasswordController {
  // ✅ Change Password
  static async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { currentPassword, newPassword, phoneNumber } = req.body;
      const userId = req.user?.id;

      console.log('🔐 Password change request:', { 
        userId, 
        phoneNumber: phoneNumber ? phoneNumber.substring(0, 6) + '***' : 'not provided',
        hasCurrentPassword: !!currentPassword,
        hasNewPassword: !!newPassword
      });

      // 🔐 Auth check
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // 🧾 Validation
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required'
        });
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password'
        });
      }

      const sqlite = dbManager.getSQLite();

      // 👤 Find user by phone number in players table
      let currentUser = await sqlite.get(
        'SELECT * FROM players WHERE phone_number = ?',
        [phoneNumber]
      );

      if (!currentUser) {
        // Also check users table
        currentUser = await sqlite.get(
          'SELECT * FROM users WHERE phone_number = ?',
          [phoneNumber]
        );
      }

      console.log('👤 User found by phone:', { found: !!currentUser, table: currentUser ? 'players' : 'none' });

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this phone number'
        });
      }

      // 🔑 Verify current password
      const passwordHash = currentUser.password_hash || currentUser.password;
      
      if (!passwordHash) {
        return res.status(400).json({
          success: false,
          message: 'User password not set properly'
        });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, passwordHash);
      console.log('🔐 Current password valid:', isPasswordValid);

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // 🔐 Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      console.log('🔐 New password hashed successfully');

      // 📝 Update password in correct table
      const tableName = currentUser.id === userId ? 'players' : 'users';
      
      await sqlite.run(
        `UPDATE ${tableName} SET password_hash = ? WHERE phone_number = ?`,
        [hashedNewPassword, phoneNumber]
      );

      console.log('✅ Password updated successfully');

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error: any) {
      console.error('❌ Change password error:', error);
      console.error('❌ Stack:', error?.stack);

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
