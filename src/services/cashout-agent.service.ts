import { dbManager } from '../database/databaseManager';

export class CashoutAgentService {
  private db = dbManager.getSQLite().getRawDatabase();

  /**
   * Create a new cashout request
   */
  async createCashoutRequest(cashoutData: {
    withdraw_player: string;
    amount: number;
    cashier_name: string;
    cashier_code?: string;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    return new Promise((resolve, reject) => {
      // Generate 5-digit random code
      const generatedCode = Math.floor(10000 + Math.random() * 90000).toString();
      
      // Check player balance and withdrawable amount
      this.db.get(
        'SELECT * FROM players WHERE phone_number = ?',
        [cashoutData.withdraw_player],
        (err, player: any) => {
          if (err) {
            console.error('Error fetching player:', err);
            reject({ success: false, message: 'Database error' });
            return;
          }

          if (!player) {
            reject({ success: false, message: 'Player not found' });
            return;
          }

          // Check if player has sufficient withdrawable balance
          if (player.withdrawable < cashoutData.amount) {
            reject({ success: false, message: `Insufficient withdrawable balance. Available: ${player.withdrawable}, Requested: ${cashoutData.amount}` });
            return;
          }

          // Check if player has sufficient total balance (withdrawable + non_withdrawable)
          const totalAvailable = player.withdrawable + (player.non_withdrawable || 0);
          if (totalAvailable < cashoutData.amount) {
            reject({ success: false, message: `Insufficient total balance. Available: ${totalAvailable}, Requested: ${cashoutData.amount}` });
            return;
          }

          // Start transaction
          this.db.serialize(() => {
            // Insert cashout request
            this.db.run(
              `INSERT INTO cashout_agent (withdraw_player, amount, cashier_name, cashier_code, status)
               VALUES (?, ?, ?, ?, 'pending')`,
              [cashoutData.withdraw_player, cashoutData.amount, cashoutData.cashier_name, generatedCode],
              (err, result) => {
                if (err) {
                  console.error('Error inserting cashout request:', err);
                  reject({ success: false, message: 'Failed to create cashout request' });
                  return;
                }

                const cashoutId = result.lastID;

                // Update player balance (decrease withdrawable)
                const newWithdrawable = player.withdrawable - cashoutData.amount;
                const newTotalBalance = player.balance - cashoutData.amount;

                this.db.run(
                  `UPDATE players 
                   SET withdrawable = ?, balance = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE phone_number = ?`,
                  [newWithdrawable, newTotalBalance, cashoutData.withdraw_player],
                  (err) => {
                    if (err) {
                      console.error('Error updating player balance:', err);
                      reject({ success: false, message: 'Failed to update player balance' });
                      return;
                    }

                    // Create transaction record
                    this.db.run(
                      `INSERT INTO transactions (phone_number, amount, type, status, reference, created_at)
                       VALUES (?, ?, 'withdrawal', 'pending', ?, CURRENT_TIMESTAMP)`,
                      [cashoutData.withdraw_player, cashoutData.amount, 'cashout_agent'],
                      (err) => {
                        if (err) {
                          console.error('Error creating transaction:', err);
                          // Don't reject - cashout was created successfully
                        }

                        resolve({
                          success: true,
                          data: {
                            cashout_id: cashoutId,
                            cashier_code: generatedCode,
                            player_balance: {
                              old: player.balance,
                              new: newTotalBalance,
                              withdrawable: newWithdrawable
                            }
                          },
                          message: `Cashout request created successfully. Your code is: ${generatedCode}`
                        });
                      }
                    );
                  }
                );
              }
            );
          });
        }
      );
    });
  }

  /**
   * Get cashout requests by cashier
   */
  async getCashoutRequestsByCashier(cashierName: string): Promise<{ success: boolean; data?: any[]; message?: string }> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM cashout_agent WHERE cashier_name = ? ORDER BY created_at DESC',
        [cashierName],
        (err, rows) => {
          if (err) {
            console.error('Error fetching cashout requests:', err);
            reject({ success: false, message: 'Database error' });
            return;
          }

          resolve({
            success: true,
            data: rows
          });
        }
      );
    });
  }

  /**
   * Get cashout request by code
   */
  async getCashoutByCode(code: string): Promise<{ success: boolean; data?: any; message?: string }> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM cashout_agent WHERE cashier_code = ?',
        [code],
        (err, row) => {
          if (err) {
            console.error('Error fetching cashout by code:', err);
            reject({ success: false, message: 'Database error' });
            return;
          }

          if (!row) {
            reject({ success: false, message: 'Invalid cashout code' });
            return;
          }

          resolve({
            success: true,
            data: row
          });
        }
      );
    });
  }

  /**
   * Update cashout status
   */
  async updateCashoutStatus(cashoutId: number, status: string): Promise<{ success: boolean; message?: string }> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE cashout_agent SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, cashoutId],
        function(err) {
          if (err) {
            console.error('Error updating cashout status:', err);
            reject({ success: false, message: 'Failed to update status' });
            return;
          }

          resolve({
            success: true,
            message: 'Cashout status updated successfully'
          });
        }
      );
    });
  }

  /**
   * Complete cashout (when agent processes it)
   */
  async completeCashout(cashoutId: number): Promise<{ success: boolean; message?: string }> {
    return new Promise((resolve, reject) => {
      // Get cashout details first
      this.db.get(
        'SELECT * FROM cashout_agent WHERE id = ?',
        [cashoutId],
        (err, cashout: any) => {
          if (err) {
            console.error('Error fetching cashout for completion:', err);
            reject({ success: false, message: 'Database error' });
            return;
          }

          if (!cashout) {
            reject({ success: false, message: 'Cashout request not found' });
            return;
          }

          if (cashout.status !== 'pending') {
            reject({ success: false, message: 'Cashout request is not pending' });
            return;
          }

          // Get player details
          this.db.get(
            'SELECT * FROM players WHERE phone_number = ?',
            [cashout.withdraw_player],
            (err, player: any) => {
              if (err) {
                console.error('Error fetching player for completion:', err);
                reject({ success: false, message: 'Database error' });
                return;
              }

              if (!player) {
                reject({ success: false, message: 'Player not found' });
                return;
              }

              // Update cashout status to completed
              this.db.run(
                'UPDATE cashout_agent SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                ['completed', cashoutId],
                (err) => {
                  if (err) {
                    console.error('Error updating cashout status to completed:', err);
                    reject({ success: false, message: 'Failed to complete cashout' });
                    return;
                  }

                  // Update transaction status
                  this.db.run(
                    `UPDATE transactions 
                     SET status = 'completed', new_balance = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE phonenumber = ? AND status = 'pending'`,
                    [player.balance, cashout.withdraw_player],
                    (err) => {
                      if (err) {
                        console.error('Error updating transaction status:', err);
                        // Don't reject - cashout was completed
                      }

                      resolve({
                        success: true,
                        message: 'Cashout completed successfully'
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  }
}
