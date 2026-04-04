import { dbManager } from '../database/databaseManager';

export class CashierDepositService {
  static async searchPlayerByPhone(phoneNumber: string) {
    try {
      const query = 'SELECT id, username, phone_number, balance, non_withdrawable FROM players WHERE phone_number = ?';
      const sqlite = dbManager.getSQLite();
      const player = await sqlite.get(query, [phoneNumber]);
      
      if (!player) {
        return { success: false, message: 'Player not found' };
      }
      
      return {
        success: true,
        data: {
          player: {
            id: player.id,
            username: player.username,
            phone_number: player.phone_number,
            balance: player.balance,
            non_withdrawable: player.non_withdrawable
          }
        }
      };
      
    } catch (error) {
      console.error('Search player error:', error);
      return { success: false, message: 'Server error during player search' };
    }
  }

  static async depositToPlayer(playerId: number, amount: number) {
    try {
      if (amount <= 0) {
        return { success: false, message: 'Deposit amount must be greater than 0' };
      }

      // Get current player data
      const getPlayerQuery = 'SELECT balance, non_withdrawable FROM players WHERE id = ?';
      const sqlite = dbManager.getSQLite();
      const player = await sqlite.get(getPlayerQuery, [playerId]);
      
      if (!player) {
        return { success: false, message: 'Player not found' };
      }

      // Update player balance
      const newBalance = player.balance + amount;
      const newNonWithdrawableBalance = player.non_withdrawable + amount;
      
      const updateQuery = 'UPDATE players SET balance = ?, non_withdrawable = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      await sqlite.run(updateQuery, [newBalance, newNonWithdrawableBalance, playerId]);

      // Create transaction record
      const transactionQuery = `
        INSERT INTO cashier_transactions (
          cashier_id, player_id, transaction_type, amount, balance_before, balance_after, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      const cashierId = 1; // This should come from authenticated user
      await sqlite.run(transactionQuery, [
        cashierId,
        playerId,
        'deposit',
        amount,
        player.balance,
        newBalance,
        'completed'
      ]);

      return {
        success: true,
        message: 'Deposit successful',
        data: {
          player: {
            id: playerId,
            balance: newBalance,
            non_withdrawable: newNonWithdrawableBalance
          },
          transaction: {
            amount,
            balance_before: player.balance,
            balance_after: newBalance,
            type: 'deposit'
          }
        }
      };
      
    } catch (error) {
      console.error('Deposit error:', error);
      return { success: false, message: 'Server error during deposit' };
    }
  }
}
