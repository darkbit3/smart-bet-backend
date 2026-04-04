import { Database } from 'sqlite3';
import { Voucher, CreateVoucherData, UpdateVoucherData } from '../models/voucher.model';
import { dbManager } from '../database/databaseManager';

export class VoucherService {
    private db: Database;

    constructor() {
        const sqlite = dbManager.getSQLite();
        if (!sqlite) {
            throw new Error('SQLite database not available');
        }
        // Access the internal db instance
        this.db = (sqlite as any).db;
    }

    // Create a new voucher
    async createVoucher(voucherData: CreateVoucherData): Promise<Voucher> {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO vouchers (voucher_code, withdraw_phone_number, deposit_phone_number, amount, status)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            this.db.run(sql, [
                voucherData.voucher_code,
                voucherData.withdraw_phone_number || null,
                voucherData.deposit_phone_number || null,
                voucherData.amount,
                voucherData.status || 'pending'
            ], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Return the created voucher
                const selectSql = 'SELECT * FROM vouchers WHERE id = ?';
                voucherService.db.get(selectSql, [this.lastID], (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(row as Voucher);
                });
            });
        });
    }

    // Get voucher by code
    async getVoucherByCode(voucherCode: string): Promise<Voucher | null> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM vouchers WHERE voucher_code = ?';
            
            this.db.get(sql, [voucherCode], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row as Voucher || null);
            });
        });
    }

    // Update voucher status and phone numbers
    async updateVoucher(voucherCode: string, updateData: UpdateVoucherData): Promise<Voucher | null> {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];
            
            if (updateData.withdraw_phone_number !== undefined) {
                fields.push('withdraw_phone_number = ?');
                values.push(updateData.withdraw_phone_number);
            }
            
            if (updateData.deposit_phone_number !== undefined) {
                fields.push('deposit_phone_number = ?');
                values.push(updateData.deposit_phone_number);
            }
            
            if (updateData.status !== undefined) {
                fields.push('status = ?');
                values.push(updateData.status);
            }
            
            if (fields.length === 0) {
                resolve(null);
                return;
            }
            
            const sql = `UPDATE vouchers SET ${fields.join(', ')} WHERE voucher_code = ?`;
            values.push(voucherCode);
            
            this.db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (this.changes === 0) {
                    resolve(null);
                    return;
                }
                
                // Return updated voucher
                voucherService.getVoucherByCode(voucherCode).then(resolve).catch(reject);
            });
        });
    }

    // Get vouchers by phone number
    async getVouchersByPhoneNumber(phoneNumber: string): Promise<Voucher[]> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM vouchers 
                WHERE withdraw_phone_number = ? OR deposit_phone_number = ?
                ORDER BY time DESC
            `;
            
            this.db.all(sql, [phoneNumber, phoneNumber], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows as Voucher[]);
            });
        });
    }

    // Get vouchers by status
    async getVouchersByStatus(status: 'pending' | 'return' | 'completed'): Promise<Voucher[]> {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM vouchers WHERE status = ? ORDER BY time DESC';
            
            this.db.all(sql, [status], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows as Voucher[]);
            });
        });
    }

    // Check if voucher is expired (24 hours)
    async isVoucherExpired(voucherCode: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT time FROM vouchers 
                WHERE voucher_code = ? AND status = 'pending'
            `;
            
            this.db.get(sql, [voucherCode], (err, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!row) {
                    resolve(false);
                    return;
                }
                
                const voucherTime = new Date(row.time);
                const currentTime = new Date();
                const timeDiff = currentTime.getTime() - voucherTime.getTime();
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                
                resolve(hoursDiff > 24);
            });
        });
    }

    // Mark expired vouchers as returned
    async markExpiredVouchersAsReturned(): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE vouchers 
                SET status = 'return' 
                WHERE status = 'pending' 
                AND datetime(time) < datetime('now', '-24 hours')
            `;
            
            this.db.run(sql, [], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.changes);
            });
        });
    }
}

// Export singleton instance
export const voucherService = new VoucherService();
