import { dbManager } from '../database/databaseManager';

export interface AdminPlayerInfo {
  id: number;
  username: string;
  phoneNumber: string;
  balance: number;
  withdrawable: number;
  non_withdrawable: number;
  bonusBalance: number;
  status: string;
  createdAt: string;
  createdBy: string;
}

export interface AdminPlayerListRequest {
  admin_username: string;
  status?: string;
  search?: string;
}

export class AdminPlayerListService {
  private static async getPlayersPhoneColumn(sqlite: any): Promise<string> {
    const tableInfo = await sqlite.all('PRAGMA table_info(players)');
    const columnNames = (tableInfo || []).map((c: any) => String(c.name).toLowerCase());

    if (columnNames.includes('phone_number')) return 'phone_number';
    if (columnNames.includes('phonenumber')) return 'phonenumber';
    if (columnNames.includes('phonenumber'.toLowerCase())) return 'phoneNumber';

    return '';
  }

  private static async buildPlayerSelect(phoneColumn: string): Promise<string> {
    const phoneExpr = phoneColumn ? `${phoneColumn} as phoneNumber` : `'' as phoneNumber`;
    return `
          id,
          username,
          ${phoneExpr},
          balance,
          withdrawable,
          non_withdrawable,
          bonus_balance as bonusBalance,
          status,
          created_at as createdAt,
          created_by as createdBy
    `;
  }

  static async getPlayersByAdmin(request: AdminPlayerListRequest): Promise<{ success: boolean; message: string; players?: AdminPlayerInfo[] }> {
    try {
      const sqlite = dbManager.getSQLite();
      const phoneColumn = await this.getPlayersPhoneColumn(sqlite);
      const selectClause = await this.buildPlayerSelect(phoneColumn);

      const adminUsername = request.admin_username.trim();
      if (!adminUsername) {
        return { success: false, message: 'Admin username is required' };
      }

      // Collect cashier usernames created by this admin
      const cashiers: { username: string }[] = await sqlite.all(
        'SELECT username FROM cashier_users WHERE created_by = ?',
        [adminUsername]
      );

      const cashierUsernames = cashiers.map(c => c.username);

      let whereClause = 'WHERE created_by = ?';
      const params: any[] = [adminUsername];

      if (cashierUsernames.length > 0) {
        const placeholders = cashierUsernames.map(() => '?').join(', ');
        whereClause = `WHERE (created_by = ? OR created_by IN (${placeholders}))`;
        params.splice(1, 0, ...cashierUsernames);
      }

      if (request.status) {
        whereClause += ' AND status = ?';
        params.push(request.status.trim());
      }

      if (request.search) {
        const searchTerm = `%${request.search.trim()}%`;
        whereClause += ' AND (username LIKE ? OR phone_number LIKE ?)';
        params.push(searchTerm, searchTerm);
      }

      const players = await sqlite.all(
        `SELECT ${selectClause} FROM players ${whereClause} ORDER BY created_at DESC`,
        params
      );

      return {
        success: true,
        message: 'Admin players retrieved successfully',
        players
      };
    } catch (error) {
      console.error('AdminPlayerListService.getPlayersByAdmin error:', error);
      return {
        success: false,
        message: 'Error fetching player list for admin'
      };
    }
  }

  // Get player by phone number
  static async getPlayerByPhone(phone_number: string): Promise<{ success: boolean; player?: AdminPlayerInfo; message: string }> {
    try {
      const sqlite = dbManager.getSQLite();
      const phoneColumn = await this.getPlayersPhoneColumn(sqlite);
      
      const player = await sqlite.get(
        `SELECT id, username, ${phoneColumn} as phoneNumber, balance, withdrawable, non_withdrawable, bonus_balance as bonusBalance, status, created_at as createdAt, created_by as createdBy FROM players WHERE ${phoneColumn} = ?`,
        [phone_number.trim()]
      );

      if (player) {
        return {
          success: true,
          player: player as AdminPlayerInfo,
          message: 'Player found successfully'
        };
      } else {
        return {
          success: false,
          message: 'Player with this phone number not found'
        };
      }
    } catch (error) {
      console.error('Error getting player by phone:', error);
      return {
        success: false,
        message: 'Failed to retrieve player'
      };
    }
  }
}
