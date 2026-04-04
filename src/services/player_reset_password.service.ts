import { dbManager } from '../database/databaseManager';

export interface ResetPasswordRecord {
  id?: number;
  phone_number: string;
  reset_code: string;
  status: 'pending' | 'verified' | 'used' | 'expired';
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  used_at?: string;
}

export class PlayerResetPasswordService {
  /**
   * Request password reset with phone number
   */
  static async requestReset(phoneNumber: string): Promise<{ success: boolean; message?: string; data?: any }> {
    const sqlite = dbManager.getSQLite();

    try {
      // Check if phone number exists in telegram_users
      const telegramUser = await sqlite.get(
        'SELECT * FROM telegram_users WHERE phone_number = ?',
        [phoneNumber]
      );

      if (!telegramUser) {
        return {
          success: false,
          message: 'Phone number not registered with Telegram. Please register your phone number with Telegram first.',
          data: {
            requiresTelegramRegistration: true,
            phoneNumber: phoneNumber
          }
        };
      }

      // Generate 6-digit reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Check if there's already a pending code
      const existingCode = await sqlite.get(
        'SELECT * FROM reset_password WHERE phone_number = ? AND status = "pending" AND expires_at > CURRENT_TIMESTAMP',
        [phoneNumber]
      );

      if (existingCode) {
        // Update existing code
        await sqlite.run(
          'UPDATE reset_password SET reset_code = ?, created_at = CURRENT_TIMESTAMP, expires_at = ? WHERE phone_number = ?',
          [resetCode, expiresAt, phoneNumber]
        );
      } else {
        // Create new reset code
        await sqlite.run(
          'INSERT INTO reset_password (phone_number, reset_code, status, created_at, expires_at) VALUES (?, ?, "pending", CURRENT_TIMESTAMP, ?)',
          [phoneNumber, resetCode, expiresAt]
        );
      }

      // Send reset code to Telegram bot
      const telegramSent = await this.sendResetCodeToTelegram(phoneNumber, resetCode, telegramUser.telegram_user_id);

      console.log(`✅ Reset code generated for phone: ${phoneNumber}, code: ${resetCode}`);
      console.log(`📱 Telegram bot notification: ${telegramSent ? 'Success' : 'Failed'}`);

      if (telegramSent) {
        return {
          success: true,
          message: 'Password reset code sent to your Telegram',
          data: {
            phoneNumber,
            resetCode,
            expiresAt,
            telegramSent: true
          }
        };
      } else {
        return {
          success: false,
          message: 'Failed to send reset code to Telegram. Please try again.',
          data: {
            phoneNumber,
            resetCode,
            expiresAt,
            telegramSent: false
          }
        };
      }
    } catch (error) {
      console.error('Request reset password error:', error);
      return {
        success: false,
        message: 'Failed to generate reset code'
      };
    }
  }

  /**
   * Verify reset code
   */
  static async verifyCode(phoneNumber: string, resetCode: string): Promise<{ success: boolean; message?: string; data?: any }> {
    const sqlite = dbManager.getSQLite();

    try {
      // Find valid reset code
      const resetRecord = await sqlite.get(
        'SELECT * FROM reset_password WHERE phone_number = ? AND reset_code = ? AND status = "pending" AND expires_at > CURRENT_TIMESTAMP',
        [phoneNumber, resetCode]
      );

      if (!resetRecord) {
        return {
          success: false,
          message: 'Invalid or expired reset code'
        };
      }

      // Mark code as verified
      await sqlite.run(
        'UPDATE reset_password SET status = "verified", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [resetRecord.id]
      );

      console.log(`✅ Reset code verified for phone: ${phoneNumber}, code: ${resetCode}`);

      return {
        success: true,
        message: 'Reset code verified successfully',
        data: {
          phoneNumber,
          resetCode,
          verifiedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Verify reset code error:', error);
      return {
        success: false,
        message: 'Failed to verify reset code'
      };
    }
  }

  /**
   * Reset password with verification code
   */
  static async resetPassword(phoneNumber: string, resetCode: string, newPassword: string): Promise<{ success: boolean; message?: string; data?: any }> {
    const sqlite = dbManager.getSQLite();

    try {
      // Find verified reset code
      const resetRecord = await sqlite.get(
        'SELECT * FROM reset_password WHERE phone_number = ? AND reset_code = ? AND status = "verified"',
        [phoneNumber, resetCode]
      );

      if (!resetRecord) {
        return {
          success: false,
          message: 'Invalid reset code'
        };
      }

      // Hash the new password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update player password
      const updateResult = await sqlite.run(
        'UPDATE players SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ?',
        [hashedPassword, phoneNumber]
      );

      if (updateResult.changes === 0) {
        return {
          success: false,
          message: 'Player not found with this phone number'
        };
      }

      // Mark reset code as used
      await sqlite.run(
        'UPDATE reset_password SET status = "used", used_at = CURRENT_TIMESTAMP WHERE id = ?',
        [resetRecord.id]
      );

      console.log(`✅ Password reset successfully for phone: ${phoneNumber}`);

      return {
        success: true,
        message: 'Password reset successfully',
        data: {
          phoneNumber,
          resetAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: 'Failed to reset password: ' + error.message
      };
    }
  }

  /**
   * Check if phone number is registered with Telegram
   */
  static async checkTelegramIntegration(phoneNumber: string): Promise<{ success: boolean; message?: string; data?: any }> {
    const sqlite = dbManager.getSQLite();

    try {
      const telegramUser = await sqlite.get(
        'SELECT * FROM telegram_users WHERE phone_number = ?',
        [phoneNumber]
      );

      if (telegramUser) {
        return {
          success: true,
          message: 'Phone number is registered with Telegram',
          data: {
            phoneNumber,
            telegramUserId: telegramUser.telegram_user_id,
            username: telegramUser.telegram_username,
            firstName: telegramUser.first_name
          }
        };
      } else {
        return {
          success: false,
          message: 'Phone number not found in Telegram users'
        };
      }
    } catch (error) {
      console.error('Check Telegram integration error:', error);
      return {
        success: false,
        message: 'Failed to check Telegram integration'
      };
    }
  }

  /**
   * Send reset code to Telegram bot
   */
  private static async sendResetCodeToTelegram(phoneNumber: string, resetCode: string, telegramUserId: number): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:3004/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'send_verification_code',
          data: {
            phoneNumber,
            telegramUserId: telegramUserId.toString(),
            code: resetCode
          }
        })
      });

      if (response.ok) {
        console.log('✅ Reset code sent to Telegram bot successfully');
        return true;
      } else {
        console.error('❌ Failed to send reset code to Telegram bot');
        return false;
      }
    } catch (error) {
      console.error('Send reset code to Telegram error:', error);
      return false;
    }
  }
}
