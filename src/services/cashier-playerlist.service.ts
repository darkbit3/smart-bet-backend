import { dbManager } from '../database/databaseManager';

export interface PlayerInfo {
  id: number;
  name: string;
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

export class CashierPlayerListService {
  private static async getPlayersPhoneColumn(sqlite: any): Promise<string> {
    const tableInfo = await sqlite.all('PRAGMA table_info(players)');
    const columnNames = (tableInfo || []).map((c: any) => String(c.name).toLowerCase());

    if (columnNames.includes('phone_number')) return 'phone_number';
    if (columnNames.includes('phonenumber')) return 'phonenumber';
    if (columnNames.includes('phoneNumber'.toLowerCase())) return 'phoneNumber';

    // Fallback to a safe default and avoid SQL errors by returning an empty alias expression
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

  // Get all players created by a specific cashier
  static async getPlayersByCashier(cashierUsername: string): Promise<PlayerInfo[]> {
    try {
      const sqlite = dbManager.getSQLite();
      const phoneColumn = await this.getPlayersPhoneColumn(sqlite);
      const selectClause = await this.buildPlayerSelect(phoneColumn);

      const players = await sqlite.all(
        `SELECT ${selectClause}
        FROM players 
        WHERE created_by = ? 
        ORDER BY created_at DESC`,
        [cashierUsername]
      );

      console.log(`Found ${players.length} players for cashier: ${cashierUsername}`);
      
      return players;
    } catch (error) {
      console.error('Error fetching players by cashier:', error);
      throw new Error('Failed to fetch players from database');
    }
  }

  // Get a specific player by ID (only if created by the cashier)
  static async getPlayerById(cashierUsername: string, playerId: number): Promise<PlayerInfo | null> {
    try {
      const sqlite = dbManager.getSQLite();
      const phoneColumn = await this.getPlayersPhoneColumn(sqlite);
      const selectClause = await this.buildPlayerSelect(phoneColumn);

      const player = await sqlite.get(
        `SELECT ${selectClause}
        FROM players 
        WHERE id = ? AND created_by = ?`,
        [playerId, cashierUsername]
      );

      return player || null;
    } catch (error) {
      console.error('Error fetching player by ID:', error);
      throw new Error('Failed to fetch player from database');
    }
  }

  // Search players by name or phone number for a specific cashier
  static async searchPlayers(cashierUsername: string, searchTerm: string): Promise<PlayerInfo[]> {
    try {
      const sqlite = dbManager.getSQLite();
      const phoneColumn = await this.getPlayersPhoneColumn(sqlite);
      const selectClause = await this.buildPlayerSelect(phoneColumn);
      const phoneWhere = phoneColumn || 'phone_number';

      const players = await sqlite.all(
        `SELECT ${selectClause}
        FROM players 
        WHERE created_by = ? 
        AND (username LIKE ? OR ${phoneWhere} LIKE ?)
        ORDER BY created_at DESC
        LIMIT 20`,
        [cashierUsername, `%${searchTerm}%`, `%${searchTerm}%`]
      );

      console.log(`Found ${players.length} players for cashier ${cashierUsername} with search term: ${searchTerm}`);
      
      return players;
    } catch (error) {
      console.error('Error searching players:', error);
      throw new Error('Failed to search players in database');
    }
  }

  // Get player statistics for a cashier
  static async getCashierPlayerStats(cashierUsername: string): Promise<{
    totalPlayers: number;
    activePlayers: number;
    totalBalance: number;
    totalWithdrawable: number;
  }> {
    try {
      const sqlite = dbManager.getSQLite();
      
      const stats = await sqlite.get(
        `SELECT 
          COUNT(*) as totalPlayers,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activePlayers,
          SUM(balance) as totalBalance,
          SUM(withdrawable) as totalWithdrawable
        FROM players 
        WHERE created_by = ?`,
        [cashierUsername]
      );

      return {
        totalPlayers: stats.totalPlayers || 0,
        activePlayers: stats.activePlayers || 0,
        totalBalance: stats.totalBalance || 0,
        totalWithdrawable: stats.totalWithdrawable || 0
      };
    } catch (error) {
      console.error('Error fetching cashier player stats:', error);
      throw new Error('Failed to fetch player statistics');
    }
  }
}
