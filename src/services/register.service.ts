import { sqliteDB } from '@/database/sqlite';
import bcrypt from 'bcrypt';
import { logger } from '@/utils/logger';

export interface RegisterRequest {
  username: string;
  phone_number: string;
  password: string;
  referral_code?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  errorType?: 'username_taken' | 'phone_taken' | 'invalid_format' | 'too_short' | 'referral_invalid' | 'database_error';
  player?: {
    id: number;
    username: string;
    phone_number: string;
    balance: number;
    withdrawable: number;
    non_withdrawable: number;
    bonus_balance: number;
    status: string;
    created_at: string;
  };
}

export class RegisterService {
  // Hash password
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Check if username is available
  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      console.log('🔍 Checking username availability for:', username);
      
      const existing = await sqliteDB.get(
        `SELECT id, username FROM players WHERE username = ?`,
        [username]
      );
      
      console.log('🔍 Username check result:', { 
        username, 
        found: !!existing, 
        existingUser: existing?.username 
      });
      
      return !existing;
    } catch (error) {
      console.error('❌ Error checking username availability:', error);
      logger.error('Error checking username availability:', error);
      return false;
    }
  }

  // Check if phone number is available
  async checkPhoneAvailability(phone_number: string): Promise<boolean> {
    try {
      console.log('🔍 Checking phone availability for:', phone_number);
      
      // Convert 09 format to +251 format for checking
      let formattedPhone = phone_number;
      if (phone_number.startsWith('09')) {
        formattedPhone = '+251' + phone_number.substring(1);
      }
      
      console.log('🔍 Checking formatted phone:', formattedPhone);
      
      const existing = await sqliteDB.get(
        `SELECT id, phone_number FROM players WHERE phone_number = ?`,
        [formattedPhone]
      );
      
      console.log('🔍 Phone check result:', { 
        originalPhone: phone_number,
        formattedPhone, 
        found: !!existing, 
        existingPhone: existing?.phone_number 
      });
      
      return !existing;
    } catch (error) {
      console.error('❌ Error checking phone availability:', error);
      logger.error('Error checking phone availability:', error);
      return false;
    }
  }

  // Validate referral code
  async validateReferralCode(referral_code: string): Promise<boolean> {
    try {
      if (!referral_code) return true; // Optional referral
      
      const referrer = await sqliteDB.get(
        `SELECT id FROM players WHERE username = ? AND status = 'active'`,
        [referral_code]
      );
      return !!referrer;
    } catch (error) {
      logger.error('Error validating referral code:', error);
      return false;
    }
  }

  // Register new player
  async register(registerData: RegisterRequest): Promise<RegisterResponse> {
    try {
      console.log('🔐 Register Service - Attempting registration:', {
        username: registerData.username,
        phone_number: registerData.phone_number,
        hasReferral: !!registerData.referral_code,
        passwordLength: registerData.password.length
      });

      // Validate input
      if (!registerData.username || !registerData.phone_number || !registerData.password) {
        console.log('❌ Register Service - Missing required fields:', {
          hasUsername: !!registerData.username,
          hasPhone: !!registerData.phone_number,
          hasPassword: !!registerData.password
        });
        return {
          success: false,
          message: 'Username, phone number, and password are required',
          errorType: 'invalid_format'
        };
      }

      console.log('🔐 Register Service - Basic input validation passed');

      // Validate username format (3-30 characters, alphanumeric + underscore)
      if (!registerData.username.match(/^[a-zA-Z0-9_]{3,30}$/)) {
        console.log('❌ Register Service - Invalid username format:', registerData.username);
        return {
          success: false,
          message: 'Username must be 3-30 characters (letters, numbers, underscore only)',
          errorType: 'invalid_format'
        };
      }

      console.log('🔐 Register Service - Username format validation passed');

      // Validate phone number format (Ethiopian format)
      if (!registerData.phone_number.match(/^\+2519\d{8}$/) && !registerData.phone_number.match(/^09\d{8}$/)) {
        console.log('❌ Register Service - Invalid phone format:', registerData.phone_number);
        return {
          success: false,
          message: 'Invalid phone number format. Use +2519xxxxxxxx or 09xxxxxxxx',
          errorType: 'invalid_format'
        };
      }

      console.log('🔐 Register Service - Phone format validation passed');

      // Validate password strength (minimum 6 characters)
      if (registerData.password.length < 6) {
        console.log('❌ Register Service - Password too short:', registerData.password.length);
        return {
          success: false,
          message: 'Password must be at least 6 characters long',
          errorType: 'too_short'
        };
      }

      console.log('🔐 Register Service - Password validation passed');

      // Convert 09 format to +251 format
      let formattedPhone = registerData.phone_number;
      if (registerData.phone_number.startsWith('09')) {
        formattedPhone = '+251' + registerData.phone_number.substring(1);
      }

      // Check username availability
      const isUsernameAvailable = await this.checkUsernameAvailability(registerData.username);
      if (!isUsernameAvailable) {
        console.log('❌ Register Service - Username already taken:', registerData.username);
        return {
          success: false,
          message: 'Username is already taken. Please choose a different username.',
          errorType: 'username_taken'
        };
      }

      // Check phone number availability
      const isPhoneAvailable = await this.checkPhoneAvailability(formattedPhone);
      if (!isPhoneAvailable) {
        console.log('❌ Register Service - Phone number already registered:', formattedPhone);
        return {
          success: false,
          message: 'Phone number is already registered. Please use a different phone number.',
          errorType: 'phone_taken'
        };
      }

      // Validate referral code if provided
      if (registerData.referral_code) {
        const isReferralValid = await this.validateReferralCode(registerData.referral_code);
        if (!isReferralValid) {
          return {
            success: false,
            message: 'Invalid referral code. Please check the code and try again.',
            errorType: 'referral_invalid'
          };
        }
      }

      // Hash password
      const passwordHash = await this.hashPassword(registerData.password);

      // Insert new player
      const result = await sqliteDB.run(
        `INSERT INTO players (
          username, 
          phone_number, 
          password_hash, 
          last_password_change,
          balance,
          withdrawable,
          non_withdrawable,
          bonus_balance,
          created_by,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          registerData.username,
          formattedPhone,
          passwordHash,
          new Date().toISOString(),
          0, // Initial balance
          0, // Initial withdrawable
          0, // Initial non_withdrawable
          0, // Initial bonus_balance
          registerData.referral_code || 'self',
          'active',
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

      if (result.lastID) {
        // Fetch the newly created player
        const newPlayer = await sqliteDB.get(
          `SELECT 
            id, 
            username, 
            phone_number, 
            balance, 
            withdrawable, 
            non_withdrawable, 
            bonus_balance, 
            status, 
            created_at
          FROM players WHERE id = ?`,
          [result.lastID]
        );

        console.log('🎉 Register Service - Registration successful:', {
          id: newPlayer.id,
          username: newPlayer.username,
          phone: newPlayer.phone_number
        });

        return {
          success: true,
          message: 'Registration successful! Welcome to Smart Bet!',
          player: newPlayer
        };
      } else {
        return {
          success: false,
          message: 'Failed to create player account'
        };
      }

    } catch (error: any) {
      console.error('❌ Register Service - Registration error:', error);
      
      // Handle unique constraint violations
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        if (error.message.includes('username')) {
          return {
            success: false,
            message: 'Username is already taken. Please choose a different username.',
            errorType: 'username_taken'
          };
        } else if (error.message.includes('phone_number')) {
          return {
            success: false,
            message: 'Phone number is already registered. Please use a different phone number.',
            errorType: 'phone_taken'
          };
        }
      }

      return {
        success: false,
        message: 'Registration failed. Please try again.',
        errorType: 'database_error'
      };
    }
  }
}
