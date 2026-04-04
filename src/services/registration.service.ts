import { sqliteDB, SQLiteDatabase } from '../database/sqlite';
import { logger } from '../utils/logger';
import axios from 'axios';

export class RegistrationService {
  private static instance: RegistrationService;
  private db: SQLiteDatabase;

  constructor() {
    this.db = sqliteDB;
  }

  static getInstance(): RegistrationService {
    if (!RegistrationService.instance) {
      RegistrationService.instance = new RegistrationService();
    }
    return RegistrationService.instance;
  }

  /**
   * Request registration OTP
   */
  async requestRegistrationOtp(registrationData: any) {
    const { username, phone_number, password, confirm_password, referral_code } = registrationData;

    try {
      // Check if phone number already exists in players table
      const existingPlayer = await this.db.get(
        'SELECT id FROM players WHERE phone_number = ?',
        [phone_number]
      );

      if (existingPlayer) {
        return {
          success: false,
          message: 'Phone number is already registered'
        };
      }

      // Check if username already exists
      const existingUsername = await this.db.get(
        'SELECT id FROM players WHERE username = ?',
        [username]
      );

      if (existingUsername) {
        return {
          success: false,
          message: 'Username is already taken'
        };
      }

      // Check if phone number exists in telegram_users
      const telegramUser = await this.db.get(
        'SELECT * FROM telegram_users WHERE phone_number = ?',
        [phone_number]
      );

      // Generate 6-digit registration code (always generate, even if not registered with Telegram)
      const registrationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Check if there's already a pending registration
      const existingRegistration = await this.db.get(
        'SELECT * FROM telegram_register WHERE phone_number = ? AND status = "pending" AND expires_at > CURRENT_TIMESTAMP',
        [phone_number]
      );

      if (existingRegistration) {
        // Update existing registration
        await this.db.run(
          'UPDATE telegram_register SET reset_code = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ?',
          [registrationCode, expiresAt, phone_number]
        );
      } else {
        // Insert new registration
        await this.db.run(
          `INSERT INTO telegram_register (phone_number, reset_code, status, expires_at) 
           VALUES (?, ?, 'pending', ?)`,
          [phone_number, registrationCode, expiresAt]
        );
      }

      // Store temporary registration data in the used_at column (as JSON string)
      const tempData = JSON.stringify({
        username,
        phone_number,
        password, // In production, this should be hashed before storing
        confirm_password,
        referral_code
      });

      // Update registration with temp data using used_at column to store JSON
      await this.db.run(
        'UPDATE telegram_register SET used_at = ? WHERE phone_number = ?',
        [tempData, phone_number]
      );

      console.log(`✅ Registration code generated for phone: ${phone_number}, code: ${registrationCode}`);
      
      // Verify the data was stored correctly
      const storedRecord = await this.db.get(
        'SELECT * FROM telegram_register WHERE phone_number = ?',
        [phone_number]
      );
      console.log(`📋 Stored registration record:`, storedRecord);

      // If no Telegram user, return success with requiresTelegramRegistration flag
      if (!telegramUser) {
        return {
          success: true,
          message: 'Registration code generated. Please register with Telegram to receive the code.',
          data: {
            requiresTelegramRegistration: true,
            phone_number,
            registrationCode,
            expiresAt,
            telegramSent: false
          }
        };
      }

      // Send registration code to Telegram bot
      const telegramSent = await this.sendRegistrationCodeToTelegram(phone_number, registrationCode, telegramUser.telegram_user_id);

      console.log(`📱 Telegram bot notification: ${telegramSent ? 'Success' : 'Failed'}`);

      if (telegramSent) {
        return {
          success: true,
          message: 'Registration code sent to your Telegram',
          data: {
            phone_number,
            registrationCode,
            expiresAt,
            telegramSent: true
          }
        };
      } else {
        return {
          success: false,
          message: 'Failed to send registration code to Telegram. Please try again.',
          data: {
            phone_number,
            registrationCode,
            expiresAt,
            telegramSent: false
          }
        };
      }
    } catch (error) {
      console.error('Registration OTP request error:', error);
      logger.error('Registration OTP request error:', error);
      return {
        success: false,
        message: 'Failed to request registration code'
      };
    }
  }

  /**
   * Verify registration OTP and complete registration
   */
  async verifyRegistrationOtp(phoneNumber: string, registrationCode: string) {
    try {
      console.log(`🔍 Verifying registration: phone=${phoneNumber}, code=${registrationCode}`);
      
      // Get registration record
      const registration = await this.db.get(
        'SELECT * FROM telegram_register WHERE phone_number = ? AND reset_code = ? AND status = "pending" AND expires_at > CURRENT_TIMESTAMP',
        [phoneNumber, registrationCode]
      );

      console.log(`📋 Registration record found:`, registration);

      if (!registration) {
        // Check if there's any record for this phone number
        const anyRecord = await this.db.get(
          'SELECT * FROM telegram_register WHERE phone_number = ?',
          [phoneNumber]
        );
        console.log(`📋 Any record for phone:`, anyRecord);
        
        return {
          success: false,
          message: 'Invalid or expired registration code'
        };
      }

      // Parse temporary registration data
      let registrationData;
      try {
        registrationData = JSON.parse(registration.used_at || '{}');
      } catch (error) {
        return {
          success: false,
          message: 'Invalid registration data'
        };
      }

      // Hash password (you should use bcrypt in production)
      const bcrypt = require('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(registrationData.password, saltRounds);

      // Insert new player
      await this.db.run(
        `INSERT INTO players (username, phone_number, password_hash, created_by, created_at, updated_at) 
         VALUES (?, ?, ?, 'self', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          registrationData.username,
          registrationData.phone_number,
          hashedPassword
        ]
      );

      // Mark registration as used
      await this.db.run(
        'UPDATE telegram_register SET status = "used", used_at = CURRENT_TIMESTAMP WHERE id = ?',
        [registration.id]
      );

      console.log(`✅ Registration completed for user: ${registrationData.username}`);

      return {
        success: true,
        message: 'Registration completed successfully',
        data: {
          username: registrationData.username,
          phoneNumber: registrationData.phone_number
        }
      };
    } catch (error) {
      console.error('Registration verification error:', error);
      logger.error('Registration verification error:', error);
      return {
        success: false,
        message: 'Failed to complete registration'
      };
    }
  }

  /**
   * Resend registration OTP
   */
  async resendRegistrationOtp(phoneNumber: string) {
    try {
      // Get existing registration
      const registration = await this.db.get(
        'SELECT * FROM telegram_register WHERE phone_number = ? AND status = "pending"',
        [phoneNumber]
      );

      if (!registration) {
        return {
          success: false,
          message: 'No pending registration found'
        };
      }

      // Generate new code
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Update registration
      await this.db.run(
        'UPDATE telegram_register SET reset_code = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ?',
        [newCode, newExpiresAt, phoneNumber]
      );

      // Get telegram user
      const telegramUser = await this.db.get(
        'SELECT telegram_user_id FROM telegram_users WHERE phone_number = ?',
        [phoneNumber]
      );

      if (!telegramUser) {
        return {
          success: false,
          message: 'Phone number not found in Telegram users'
        };
      }

      // Send new code to Telegram
      const telegramSent = await this.sendRegistrationCodeToTelegram(phoneNumber, newCode, telegramUser.telegram_user_id);

      if (telegramSent) {
        return {
          success: true,
          message: 'New registration code sent to Telegram',
          data: {
            registrationCode: newCode,
            expiresAt: newExpiresAt
          }
        };
      } else {
        return {
          success: false,
          message: 'Failed to send new code to Telegram'
        };
      }
    } catch (error) {
      console.error('Resend registration OTP error:', error);
      return {
        success: false,
        message: 'Failed to resend registration code'
      };
    }
  }

  /**
   * Send registration code to Telegram bot
   */
  private async sendRegistrationCodeToTelegram(phoneNumber: string, code: string, telegramUserId: string): Promise<boolean> {
    try {
      const telegramBotUrl = process.env.TELEGRAM_BOT_URL || 'http://localhost:3004';
      
      const response = await axios.post(`${telegramBotUrl}/notify`, {
        type: 'send_registration_code',
        data: {
          phoneNumber,
          code,
          telegramUserId
        }
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.ADMIN_API_KEY || 'admin123456789'
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error('Failed to send registration code to Telegram bot:', error);
      return false;
    }
  }

  /**
   * Check for pending registration codes for a phone number
   */
  async checkPendingRegistrationCodes(phoneNumber: string, telegramUserId: number): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Find all pending registration codes for this phone number
      const pendingCodes = await this.db.all(
        'SELECT * FROM telegram_register WHERE phone_number = ? AND status = "pending" AND expires_at > CURRENT_TIMESTAMP',
        [phoneNumber]
      );

      if (pendingCodes.length === 0) {
        return {
          success: true,
          message: 'No pending registration codes found',
          data: { pendingCodes: [] }
        };
      }

      console.log(`📋 Found ${pendingCodes.length} pending registration codes for ${phoneNumber}`);

      return {
        success: true,
        message: `Found ${pendingCodes.length} pending registration codes`,
        data: { pendingCodes }
      };
    } catch (error) {
      console.error('Check pending registration codes error:', error);
      logger.error('Check pending registration codes error:', error);
      return {
        success: false,
        message: 'Failed to check pending registration codes'
      };
    }
  }
}
