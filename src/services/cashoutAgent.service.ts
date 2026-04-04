import { generateCashierCode } from '../utils/cashierCodeGenerator';
import { dbManager } from '../database/databaseManager';

export interface CashoutAgentRequest {
  withdraw_player: string;
  amount: number;
  cashier_name: string;
}

export interface CashoutAgentResponse {
  success: boolean;
  message: string;
  data?: {
    cashier_code: string;
    status: string;
  };
}

export class CashoutAgentService {
  
  constructor() {
    console.log('✅ CashoutAgentService initialized successfully');
  }

  private getDb() {
    const sqlite = dbManager.getSQLite();
    return sqlite.getRawDatabase();
  }

  async processCashoutRequest(request: CashoutAgentRequest): Promise<CashoutAgentResponse> {
    console.log('🔴 Processing cashout request:', request);
    const db = this.getDb();
    console.log('🔴 Database available:', !!db);
    
    return new Promise((resolve, reject) => {
      try {
        // Check if database is properly initialized
        if (!db) {
          console.error('❌ Database not available in processCashoutRequest');
          resolve({
            success: false,
            message: 'Database not available'
          });
          return;
        }
        
        // Start transaction
        db.serialize(() => {
          console.log('🔴 Starting transaction');
          db.run('BEGIN TRANSACTION');

          // Step 1: Find player and check withdrawable balance
          console.log('🔴 Looking up player:', request.withdraw_player);
          db.get(
            'SELECT id, withdrawable, balance FROM players WHERE phone_number = ?',
            [request.withdraw_player],
            (err: any, player: any) => {
              if (err) {
                console.error('❌ Error finding player:', err);
                db.run('ROLLBACK', () => {
                  reject(err);
                });
                return;
              }

              console.log('🔴 Player lookup result:', !!player);
              if (!player) {
                console.log('❌ Player not found');
                db.run('ROLLBACK', () => {
                  resolve({
                    success: false,
                    message: 'Player not found'
                  });
                });
                return;
              }

              console.log(`🔴 Player withdrawable: ${player.withdrawable}, Requested: ${request.amount}`);
              if (player.withdrawable < request.amount) {
                console.log('❌ Insufficient balance');
                db.run('ROLLBACK', () => {
                  resolve({
                    success: false,
                    message: `Insufficient withdrawable balance. Available: $${player.withdrawable}, Requested: $${request.amount}`
                  });
                });
                return;
              }

              // Step 2: Update player withdrawable balance
              const newWithdrawable = player.withdrawable - request.amount;
              console.log('🔴 Updating player balance to:', newWithdrawable);
              db.run(
                'UPDATE players SET withdrawable = ? WHERE id = ?',
                [newWithdrawable, player.id],
                (err: any) => {
                  if (err) {
                    console.error('❌ Error updating player balance:', err);
                    db.run('ROLLBACK', () => {
                      reject(err);
                    });
                    return;
                  }
                  console.log('✅ Player balance updated');

                  // Step 3: Generate cashier code
                  const cashierCode = generateCashierCode();
                  console.log('🔴 Generated cashier code:', cashierCode);

                  // Step 4: Create cashout agent record
                  console.log('🔴 Creating cashout agent record');
                  db.run(
                    `INSERT INTO cashout_agent 
                     (withdraw_phonenumber, amount, cashier_name, status, created_at, updated_at, cashier_code)
                     VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)`,
                    [request.withdraw_player, request.amount, request.cashier_name, cashierCode],
                    (err: any) => {
                      if (err) {
                        console.error('❌ Error creating cashout agent record:', err);
                        db.run('ROLLBACK', () => {
                          reject(err);
                        });
                        return;
                      }
                      console.log('✅ Cashout agent record created');

                      // Step 5: Create transaction record
                      console.log('🔴 Creating transaction record');
                      db.run(
                        `INSERT INTO transactions 
                         (phone_number, amount, type, status, reference, created_at)
                         VALUES (?, ?, 'withdrawal', 'pending', ?, CURRENT_TIMESTAMP)`,
                        [request.withdraw_player, request.amount, cashierCode],
                        (err: any) => {
                          if (err) {
                            console.error('❌ Error creating transaction record:', err);
                            db.run('ROLLBACK', () => {
                              reject(err);
                            });
                            return;
                          }
                          console.log('✅ Transaction record created');

                          // Commit transaction
                          db.run('COMMIT', (err: any) => {
                            if (err) {
                              console.error('❌ Error committing transaction:', err);
                              reject(err);
                            } else {
                              console.log('✅ Transaction committed successfully');
                              resolve({
                                success: true,
                                message: 'Cashout request submitted successfully!',
                                data: {
                                  cashier_code: cashierCode,
                                  status: 'pending'
                                }
                              });
                            }
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
      } catch (error) {
        console.error('❌ Unexpected error in processCashoutRequest:', error);
        const db = this.getDb();
        if (db && typeof db.run === 'function') {
          db.run('ROLLBACK', () => {
            reject(error);
          });
        } else {
          reject(error);
        }
      }
    });
  }

  async getCashoutRequests(cashierName?: string): Promise<any[]> {
    console.log('🔴 getCashoutRequests called, cashierName:', cashierName);
    
    return new Promise((resolve, reject) => {
      const db = this.getDb();
      if (!db) {
        console.error('❌ Database not available in getCashoutRequests');
        reject(new Error('Database not available'));
        return;
      }
      
      let query = `
        SELECT ca.*, p.username 
        FROM cashout_agent ca 
        LEFT JOIN players p ON ca.withdraw_phonenumber = p.phone_number
        ORDER BY ca.created_at DESC
      `;
      
      let params: any[] = [];
      
      if (cashierName) {
        query = `
          SELECT ca.*, p.username 
          FROM cashout_agent ca 
          LEFT JOIN players p ON ca.withdraw_phonenumber = p.phone_number
          WHERE ca.cashier_name = ?
          ORDER BY ca.created_at DESC
        `;
        params = [cashierName];
      }

      console.log('🔴 Executing query:', query);
      db.all(query, params, (err: any, rows: any) => {
        if (err) {
          console.error('❌ Error getting cashout requests:', err);
          reject(err);
        } else {
          console.log(`✅ Retrieved ${rows?.length || 0} cashout requests`);
          resolve(rows || []);
        }
      });
    });
  }

  async updateCashoutStatus(id: number, status: string, cashierName: string): Promise<boolean> {
    console.log('🔴 updateCashoutStatus called:', { id, status, cashierName });
    
    return new Promise((resolve, reject) => {
      const db = this.getDb();
      if (!db) {
        console.error('❌ Database not available in updateCashoutStatus');
        reject(new Error('Database not available'));
        return;
      }
      
      db.run(
        'UPDATE cashout_agent SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND cashier_name = ?',
        [status, id, cashierName],
        function(this: any, err: any) {
          if (err) {
            console.error('❌ Error updating cashout status:', err);
            reject(err);
          } else {
            console.log(`✅ Updated ${this.changes} records`);
            resolve(this.changes > 0);
          }
        }
      );
    });
  }
}