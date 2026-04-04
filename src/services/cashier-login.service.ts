import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AdminUsersService } from './admin-users.service';

export class CashierLoginService {
    private db: sqlite3.Database;
    private jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

    constructor() {
        this.db = new sqlite3.Database('data/smart-betting.db');
    }

    async createCashierUser(data: { username: string; password: string; confirm_password: string; created_by: string; initial_balance?: number }): Promise<any> {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO cashier_users (username, password_hash, created_by, balance, number_of_players, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [data.username, hashedPassword, data.created_by, data.initial_balance || 0, 0],
                function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            reject(new Error('Username already taken'));
                        } else {
                            reject(err);
                        }
                    } else {
                        // Update admin counters when cashier created by admin
                        if (data.created_by) {
                          AdminUsersService.updateAdminCounts(data.created_by).catch((err) => {
                            console.error('Error updating admin counts after cashier creation:', err);
                          });
                        }

                        resolve({ 
                            cashier_user: {
                                id: this.lastID,
                                username: data.username,
                                created_by: data.created_by,
                                balance: data.initial_balance || 0,
                                number_of_players: 0,
                                status: 'active'
                            }
                        });
                    }
                }
            );
        });
    }

    async login(data: { username: string; password: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM cashier_users WHERE username = ?',
                [data.username],
                async (err, row: any) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!row) {
                        reject(new Error('Invalid username or password'));
                        return;
                    }

                    const isPasswordValid = await bcrypt.compare(data.password, row.password_hash);
                    
                    if (!isPasswordValid) {
                        reject(new Error('Invalid username or password'));
                        return;
                    }

                    const token = jwt.sign(
                        { id: row.id, username: row.username },
                        this.jwtSecret,
                        { expiresIn: '8h' }
                    );

                    resolve({
                        cashier_user: this.sanitizeCashierUser(row),
                        tokens: { accessToken: token }
                    });
                }
            );
        });
    }

    verifyToken(token: string): any {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    async getCashierUserById(id: number): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM cashier_users WHERE id = ?',
                [id],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });
    }

    async updateCashierUser(id: number, data: { username?: string; balance?: number; number_of_players?: number; status?: string }): Promise<any> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.username) {
            updates.push('username = ?');
            values.push(data.username);
        }
        if (data.balance !== undefined) {
            updates.push('balance = ?');
            values.push(data.balance);
        }
        if (data.number_of_players !== undefined) {
            updates.push('number_of_players = ?');
            values.push(data.number_of_players);
        }
        if (data.status) {
            updates.push('status = ?');
            values.push(data.status);
        }

        if (updates.length === 0) return;

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE cashier_users SET ${updates.join(', ')} WHERE id = ?`,
                values,
                function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            reject(new Error('Username already taken'));
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve({ id, ...data });
                    }
                }
            );
        });
    }

    async getAllCashierUsers(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM cashier_users ORDER BY created_at DESC',
                [],
                (err, rows) => err ? reject(err) : resolve(rows)
            );
        });
    }

    async deleteCashierUser(id: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM cashier_users WHERE id = ?',
                [id],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    async changePassword(id: number, currentPassword: string, newPassword: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT password_hash FROM cashier_users WHERE id = ?',
                [id],
                async (err, row: any) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!row) {
                        reject(new Error('Cashier user not found'));
                        return;
                    }

                    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, row.password_hash);
                    
                    if (!isCurrentPasswordValid) {
                        reject(new Error('Current password is incorrect'));
                        return;
                    }

                    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

                    this.db.run(
                        'UPDATE cashier_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [hashedNewPassword, id],
                        (err) => err ? reject(err) : resolve()
                    );
                }
            );
        });
    }

    sanitizeCashierUser(cashierUser: any): any {
        const { password_hash, ...sanitized } = cashierUser;
        return sanitized;
    }
}

export const cashierLoginService = new CashierLoginService();
