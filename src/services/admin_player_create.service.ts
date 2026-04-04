import { dbManager } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { AdminUsersService } from './admin-users.service';

export interface CreatePlayerData {
  username: string;
  phone_number: string;
  password: string;
  created_by: string;
  referral_code?: string;
}

export class AdminPlayerCreateService {
  // Create new player
  static async createPlayer(playerData: CreatePlayerData): Promise<{ success: boolean; message: string; playerId?: number }> {
    try {
      const sqlite = dbManager.getSQLite();

      // Store password as plain text for admin-created players
      const password_hash = playerData.password;

      // Insert new player
      const result = await sqlite.run(
        `INSERT INTO players (
          username, phone_number, password_hash, last_password_change,
          balance, withdrawable, non_withdrawable, bonus_balance,
          status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          playerData.username,
          playerData.phone_number,
          password_hash,
          new Date().toISOString(),
          0, // balance
          0, // withdrawable
          0, // non_withdrawable
          0, // bonus_balance
          'active', // status
          playerData.created_by,
          new Date().toISOString(), // created_at
          new Date().toISOString()  // updated_at
        ]
      );

      if (result.changes > 0) {
        logger.info(`Player created successfully: ${playerData.username}`);

        // Update admin counts for the admin who created this player
        await AdminUsersService.updateAdminCounts(playerData.created_by);

        return {
          success: true,
          message: 'Player created successfully',
          playerId: result.lastID
        };
      } else {
        return {
          success: false,
          message: 'Failed to create player'
        };
      }
    } catch (error) {
      logger.error('Error creating player:', error);
      if (error instanceof Error) {
        // Handle unique constraint violations
        if (error.message.includes('UNIQUE constraint failed')) {
          if (error.message.includes('username')) {
            return {
              success: false,
              message: 'Username already exists'
            };
          } else if (error.message.includes('phone_number')) {
            return {
              success: false,
              message: 'Phone number already exists'
            };
          }
        }
        return {
          success: false,
          message: error.message
        };
      }
      return {
        success: false,
        message: 'Failed to create player'
      };
    }
  }
}