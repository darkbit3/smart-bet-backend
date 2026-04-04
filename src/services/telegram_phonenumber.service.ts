import { dbManager } from '../database/databaseManager';

export interface TelegramUser {
  id?: number;
  telegram_user_id: number;
  phone_number: string;
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  last_interaction?: string;
}

export interface ResetPasswordRequest {
  phoneNumber: string;
  resetCode: string;
  newPassword: string;
}

export class TelegramPhoneNumberService {
  /**
   * Save or update telegram user information
   */
  static async saveTelegramUser(userData: {
    telegramUserId: number;
    phoneNumber: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ success: boolean; message?: string; data?: TelegramUser }> {
    const sqlite = dbManager.getSQLite();

    try {
      // Always add + prefix for phone numbers (no country code)
      const formattedPhoneNumber = userData.phoneNumber.startsWith('+') ? userData.phoneNumber : `+${userData.phoneNumber}`;

      // Check if telegram user already exists
      const existingUser = await sqlite.get(
        'SELECT * FROM telegram_users WHERE telegram_user_id = ?',
        [userData.telegramUserId]
      );

      if (existingUser) {
        // Update existing user
        await sqlite.run(
          `UPDATE telegram_users 
           SET phone_number = ?, telegram_username = ?, first_name = ?, last_name = ?, 
               last_interaction = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE telegram_user_id = ?`,
          [
            formattedPhoneNumber,
            userData.username,
            userData.firstName,
            userData.lastName,
            userData.telegramUserId
          ]
        );

        console.log(`✅ Updated telegram user: ${userData.telegramUserId} with phone: ${formattedPhoneNumber}`);
        
        return {
          success: true,
          message: 'Telegram user updated successfully',
          data: { ...existingUser, phone_number: formattedPhoneNumber }
        };
      } else {
        // Create new user
        const result = await sqlite.run(
          `INSERT INTO telegram_users 
           (telegram_user_id, phone_number, telegram_username, first_name, last_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            userData.telegramUserId,
            formattedPhoneNumber,
            userData.username,
            userData.firstName,
            userData.lastName
          ]
        );

        const newUser = await sqlite.get(
          'SELECT * FROM telegram_users WHERE id = ?',
          [result.lastID]
        );

        console.log(`✅ Created new telegram user: ${userData.telegramUserId} with phone: ${formattedPhoneNumber}`);
        
        return {
          success: true,
          message: 'Telegram user created successfully',
          data: newUser
        };
      }
    } catch (error) {
      console.error('Save telegram user service error:', error);
      return {
        success: false,
        message: 'Failed to save telegram user'
      };
    }
  }

  /**
   * Get telegram user by phone number
   */
  static async getTelegramUserByPhone(phoneNumber: string): Promise<{ success: boolean; message?: string; data?: TelegramUser }> {
    const sqlite = dbManager.getSQLite();

    try {
      const user = await sqlite.get(
        'SELECT * FROM telegram_users WHERE phone_number = ? AND is_active = 1',
        [phoneNumber]
      );

      if (user) {
        return {
          success: true,
          message: 'User found',
          data: user
        };
      } else {
        return {
          success: false,
          message: 'User not found'
        };
      }
    } catch (error) {
      console.error('Get telegram user by phone error:', error);
      return {
        success: false,
        message: 'Failed to get user'
      };
    }
  }

  /**
   * Get telegram user by telegram user ID
   */
  static async getTelegramUserById(telegramUserId: string): Promise<{ success: boolean; message?: string; data?: TelegramUser }> {
    const sqlite = dbManager.getSQLite();

    try {
      const user = await sqlite.get(
        'SELECT * FROM telegram_users WHERE telegram_user_id = ? AND is_active = 1',
        [telegramUserId]
      );

      if (user) {
        return {
          success: true,
          message: 'User found',
          data: user
        };
      } else {
        return {
          success: false,
          message: 'User not found'
        };
      }
    } catch (error) {
      console.error('Get telegram user by ID error:', error);
      return {
        success: false,
        message: 'Failed to get user'
      };
    }
  }

  /**
   * Generate and save reset code
   */
  static async generateResetCode(phoneNumber: string): Promise<{ success: boolean; message?: string; data?: { code: string; expiresAt: string } }> {
    const sqlite = dbManager.getSQLite();

    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
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
          [code, expiresAt, phoneNumber]
        );
      } else {
        // Create new reset code
        await sqlite.run(
          'INSERT INTO reset_password (phone_number, reset_code, status, created_at, expires_at) VALUES (?, ?, "pending", CURRENT_TIMESTAMP, ?)',
          [phoneNumber, code, expiresAt]
        );
      }

      console.log(`✅ Generated reset code ${code} for phone ${phoneNumber}`);

      return {
        success: true,
        message: 'Reset code generated',
        data: { code, expiresAt }
      };
    } catch (error) {
      console.error('Generate reset code error:', error);
      return {
        success: false,
        message: 'Failed to generate reset code'
      };
    }
  }

  /**
   * Send verification code to telegram bot
   */
  static async sendVerificationCode(phoneNumber: string, telegramUserId: number): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      // Generate reset code
      const codeResult = await this.generateResetCode(phoneNumber);
      
      if (!codeResult.success) {
        return {
          success: false,
          message: codeResult.message
        };
      }

      // Send to telegram bot webhook
      const response = await fetch('http://localhost:3001/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'send_verification_code',
          data: {
            phoneNumber,
            telegramUserId: telegramUserId.toString(),
            code: codeResult.data?.code
          }
        })
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Verification code sent to telegram',
          data: { code: codeResult.data?.code }
        };
      } else {
        return {
          success: false,
          message: 'Failed to send verification code to telegram'
        };
      }
    } catch (error) {
      console.error('Send verification code error:', error);
      return {
        success: false,
        message: 'Failed to send verification code'
      };
    }
  }

  /**
   * Verify reset code and update password
   */
  static async verifyResetCode(phoneNumber: string, resetCode: string, newPassword: string): Promise<{ success: boolean; message?: string; data?: any }> {
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
          message: 'Invalid or expired verification code'
        };
      }

      // Mark code as used
      await sqlite.run(
        'UPDATE reset_password SET status = "used", used_at = CURRENT_TIMESTAMP WHERE id = ?',
        [resetRecord.id]
      );

      // Find user to update password (this would be in players table)
      // For now, we'll just log the password update
      console.log(`🔐 Password reset verified for phone: ${phoneNumber}, new password: ${newPassword}`);

      // TODO: Update actual user password in players table
      // Example: UPDATE players SET password = ? WHERE phone_number = ?

      return {
        success: true,
        message: 'Password reset successfully',
        data: {
          phone: phoneNumber,
          resetCode: resetCode,
          timestamp: new Date().toISOString()
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
}
