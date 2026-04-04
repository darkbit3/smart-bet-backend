import { sqliteDB } from '@/database/sqlite';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { logger } from '@/utils/logger';

export interface LoginRequest {
  phone_number: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
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
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

export class LoginService {
  // Hash password
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Compare password
  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT tokens
  private generateTokens(player: any) {
    const payload = {
      id: player.id,
      username: player.username,
      phone_number: player.phone_number,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: '7d',
    });

    const refreshToken = jwt.sign(
      { id: player.id, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
  }

  // Login with phone number and password
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('🔐 Login Service - Attempting login for:', { phone_number: loginData.phone_number });

      // Find player by phone number
      const player = await sqliteDB.get(
        `SELECT * FROM players WHERE phone_number = ? AND status = 'active'`,
        [loginData.phone_number]
      );

      if (!player) {
        console.log('❌ Login Service - Player not found:', loginData.phone_number);
        return {
          success: false,
          message: 'Phone number not found or account is inactive'
        };
      }

      console.log('✅ Login Service - Player found:', { id: player.id, username: player.username });

      // Check if player has password
      if (!player.password_hash) {
        console.log('❌ Login Service - No password set for player');
        return {
          success: false,
          message: 'No password set for this account'
        };
      }

      // Compare password with hash
      const isPasswordValid = await this.comparePassword(loginData.password, player.password_hash);

      if (!isPasswordValid) {
        console.log('❌ Login Service - Invalid password for:', loginData.phone_number);
        return {
          success: false,
          message: 'Invalid phone number or password'
        };
      }

      console.log('✅ Login Service - Password validated successfully');

      // Generate tokens
      const tokens = this.generateTokens(player);

      // Return player data without password hash
      const playerData = {
        id: player.id,
        username: player.username,
        phone_number: player.phone_number,
        balance: player.balance,
        withdrawable: player.withdrawable,
        non_withdrawable: player.non_withdrawable,
        bonus_balance: player.bonus_balance,
        status: player.status,
        created_at: player.created_at
      };

      console.log('🎉 Login Service - Login successful for:', player.username);

      return {
        success: true,
        message: 'Login successful',
        player: playerData,
        tokens: tokens
      };

    } catch (error: any) {
      console.error('❌ Login Service - Error:', error);
      logger.error('Login service error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }
}
