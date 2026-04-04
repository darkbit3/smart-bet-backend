import { dbManager } from '../database/databaseManager';
import bcrypt from 'bcrypt';
import { AdminCashierManagementService } from './admin-cashier-management.service';
import { AdminUsersService } from './admin-users.service';

export interface CreatePlayerRequest {
  username: string;
  phoneNumber: string;
  password: string;
  createdBy: string;
}

export interface CheckAvailabilityResponse {
  available: boolean;
  message: string;
}

export class CashierPlayerCreateService {
  // Check username availability
  static async checkUsernameAvailability(username: string): Promise<CheckAvailabilityResponse> {
    try {
      const sqlite = dbManager.getSQLite();
      
      const existingPlayer = await sqlite.get(
        'SELECT username FROM players WHERE username = ?',
        [username]
      );

      if (existingPlayer) {
        return {
          available: false,
          message: 'Username is already taken'
        };
      }

      return {
        available: true,
        message: 'Username is available'
      };
    } catch (error) {
      console.error('Error checking username availability:', error);
      throw new Error('Failed to check username availability');
    }
  }

  // Check phone number availability
  static async checkPhoneAvailability(phoneNumber: string): Promise<CheckAvailabilityResponse> {
    try {
      const sqlite = dbManager.getSQLite();
      
      const existingPlayer = await sqlite.get(
        'SELECT phone_number FROM players WHERE phone_number = ?',
        [phoneNumber]
      );

      if (existingPlayer) {
        return {
          available: false,
          message: 'Phone number is already registered'
        };
      }

      return {
        available: true,
        message: 'Phone number is available'
      };
    } catch (error) {
      console.error('Error checking phone availability:', error);
      throw new Error('Failed to check phone availability');
    }
  }

  // Create new player
  static async createPlayer(playerData: CreatePlayerRequest): Promise<any> {
    try {
      const sqlite = dbManager.getSQLite();
      
      // Check if username or phone already exists
      const usernameCheck = await this.checkUsernameAvailability(playerData.username);
      if (!usernameCheck.available) {
        throw new Error(usernameCheck.message);
      }

      const phoneCheck = await this.checkPhoneAvailability(playerData.phoneNumber);
      if (!phoneCheck.available) {
        throw new Error(phoneCheck.message);
      }

      // Hash the password before storing
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(playerData.password, saltRounds);

      // Insert new player
      const result = await sqlite.run(
        `INSERT INTO players (
          username, 
          phone_number, 
          password_hash, 
          balance, 
          withdrawable, 
          non_withdrawable, 
          bonus_balance, 
          status, 
          created_by,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          playerData.username,
          playerData.phoneNumber,
          hashedPassword, // Now properly hashed
          0, // balance
          0, // withdrawable
          0, // non_withdrawable
          0, // bonus_balance
          'active', // status
          playerData.createdBy
        ]
      );

      // Get the created player
      const newPlayer = await sqlite.get(
        'SELECT * FROM players WHERE id = ?',
        [result.lastID]
      );

      console.log('✅ Player created successfully:', {
        id: newPlayer.id,
        username: newPlayer.username,
        phone: newPlayer.phone_number,
        createdBy: newPlayer.created_by
      });

      // 1) Update cashier player counters
      await AdminCashierManagementService.incrementCashierPlayerCount(newPlayer.created_by);

      // 2) Refresh cashier player count from players table (reliable source)
      await AdminCashierManagementService.refreshCashierPlayerCount(newPlayer.created_by);

      // 3) Update admin summary counts (no_cashier, no_player) for admin that owns this cashier
      const cashierRow: any = await sqlite.get(
        'SELECT created_by FROM cashier_users WHERE username = ?',
        [newPlayer.created_by]
      );
      if (cashierRow?.created_by) {
        await AdminUsersService.updateAdminCounts(cashierRow.created_by);
      }

      return {
        success: true,
        data: {
          player: {
            id: newPlayer.id,
            username: newPlayer.username,
            phone_number: newPlayer.phone_number,
            balance: newPlayer.balance,
            withdrawable: newPlayer.withdrawable,
            non_withdrawable: newPlayer.non_withdrawable,
            bonus_balance: newPlayer.bonus_balance,
            status: newPlayer.status,
            created_by: newPlayer.created_by,
            created_at: newPlayer.created_at
          }
        },
        message: 'Player created successfully'
      };
    } catch (error: any) {
      console.error('❌ Error creating player:', error);
      return {
        success: false,
        message: error.message || 'Failed to create player'
      };
    }
  }
}
