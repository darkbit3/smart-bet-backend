import { dbManager } from '../database/databaseManager';

export interface PlayerCheckResult {
  usernameExists: boolean;
  phoneExists: boolean;
}

export class AdminPlayerCheckerService {
  // Check if username or phone number exists in players table
  static async checkPlayerExists(username?: string, phone_number?: string): Promise<PlayerCheckResult> {
    try {
      const sqlite = dbManager.getSQLite();

      let usernameExists = false;
      let phoneExists = false;

      // Check username if provided
      if (username) {
        const usernameResult = await sqlite.get(
          'SELECT id FROM players WHERE username = ?',
          [username.trim()]
        );
        usernameExists = !!usernameResult;
      }

      // Check phone number if provided
      if (phone_number) {
        const phoneResult = await sqlite.get(
          'SELECT id FROM players WHERE phone_number = ?',
          [phone_number.trim()]
        );
        phoneExists = !!phoneResult;
      }

      return {
        usernameExists,
        phoneExists
      };
    } catch (error) {
      console.error('Error checking player existence:', error);
      throw new Error('Failed to check player existence');
    }
  }
}