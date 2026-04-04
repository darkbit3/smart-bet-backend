import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { voucherService } from '../services/voucher.service';
import sqlite3 from 'sqlite3';

export class VoucherController {

    // =========================
    // CREATE VOUCHER
    // =========================
    createVoucher = async (req: Request, res: Response) => {
        try {
            const { voucher_code, withdraw_phone_number, deposit_phone_number, amount, status } = req.body;

            if (!voucher_code || !amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Voucher code and amount are required'
                });
            }

            const existingVoucher = await voucherService.getVoucherByCode(voucher_code);
            if (existingVoucher) {
                return res.status(400).json({
                    success: false,
                    message: 'Voucher code already exists'
                });
            }

            const voucher = await voucherService.createVoucher({
                voucher_code,
                withdraw_phone_number,
                deposit_phone_number,
                amount: parseFloat(amount),
                status: status || 'pending'
            });

            res.status(201).json({
                success: true,
                message: 'Voucher created successfully',
                data: voucher
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };

    // =========================
    // GET BY CODE
    // =========================
    getVoucherByCode = async (req: Request, res: Response) => {
        try {
            const { voucher_code } = req.params;

            const voucher = await voucherService.getVoucherByCode(voucher_code);

            if (!voucher) {
                return res.status(404).json({
                    success: false,
                    message: 'Voucher not found'
                });
            }

            res.json({ success: true, data: voucher });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };

    // =========================
    // DEPOSIT
    // Process voucher deposit
    processVoucherDeposit = async (req: Request, res: Response) => {
        try {
            const { voucher_code, phone_number } = req.body;

            if (!voucher_code || !phone_number) {
                return res.status(400).json({
                    success: false,
                    message: 'Voucher code and phone number are required'
                });
            }

            const db = new sqlite3.Database('data/smart-betting.db');

            // Find voucher by code
            const voucher: any = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT * FROM vouchers WHERE voucher_code = ?',
                    [voucher_code],
                    (err, row) => err ? reject(err) : resolve(row)
                );
            });

            if (!voucher) {
                db.close();
                return res.status(404).json({
                    success: false,
                    message: 'Invalid voucher code'
                });
            }

            if (voucher.status !== 'pending') {
                db.close();
                return res.status(400).json({
                    success: false,
                    message: 'Voucher already used'
                });
            }

            // Check if voucher is expired (24 hours)
            const voucherTime = new Date(voucher.time);
            const currentTime = new Date();
            const timeDiff = currentTime.getTime() - voucherTime.getTime();
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff > 24) {
                // Mark as expired
                await new Promise<void>((resolve, reject) => {
                    db.run(
                        'UPDATE vouchers SET status = ? WHERE voucher_code = ?',
                        ['return', voucher_code],
                        err => err ? reject(err) : resolve()
                    );
                });
                db.close();
                return res.status(400).json({
                    success: false,
                    message: 'Voucher expired'
                });
            }

            // Find player by phone number
            const player: any = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT * FROM players WHERE phone_number = ?',
                    [phone_number],
                    (err, row) => err ? reject(err) : resolve(row)
                );
            });

            if (!player) {
                db.close();
                return res.status(404).json({
                    success: false,
                    message: 'Player not found'
                });
            }

            await new Promise<void>((resolve, reject) => {
                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');

                    // Get current player balance for transaction recording
                    db.get(
                        'SELECT balance, withdrawable, non_withdrawable FROM players WHERE id = ?',
                        [player.id],
                        (err, row: any) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            const oldBalance = row.balance;
                            const newBalance = oldBalance + voucher.amount;

                            // Update player balance (add to non-withdrawable)
                            db.run(
                                `UPDATE players 
                                 SET non_withdrawable = non_withdrawable + ?,
                                     balance = balance + ?
                                 WHERE id = ?`,
                                [voucher.amount, voucher.amount, player.id]
                            );

                            // Record transaction with correct column names
                            db.run(
                                `INSERT INTO transactions (phone_number, amount, type, status, reference, created_at)
                                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                                [phone_number, voucher.amount, 'deposit', 'completed', voucher_code]
                            );

                            // Update voucher status
                            db.run(
                                `UPDATE vouchers 
                                 SET deposit_phone_number = ?, 
                                     status = 'completed'
                                 WHERE voucher_code = ?`,
                                [phone_number, voucher_code]
                            );

                            db.run('COMMIT', (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                        }
                    );
                });
            });

            db.close();

            res.json({
                success: true,
                message: `$${voucher.amount} deposited successfully`
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };

    // =========================
    // WITHDRAW (FIXED)
    // =========================
    processVoucherWithdraw = async (req: AuthenticatedRequest, res: Response) => {
        const { phone_number, amount } = req.body;

        if (!phone_number || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and amount are required'
            });
        }

        const withdrawAmount = parseFloat(amount);
        const db = new sqlite3.Database('data/smart-betting.db');

        try {
            const player: any = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT * FROM players WHERE phone_number = ?',
                    [phone_number],
                    (err, row) => err ? reject(err) : resolve(row)
                );
            });

            if (!player) {
                db.close();
                return res.status(404).json({ success: false, message: 'Player not found' });
            }

            if (player.withdrawable < withdrawAmount) {
                db.close();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient balance. Available: $${player.withdrawable}`
                });
            }

            const voucherCode = this.generateVoucherCode();

            await new Promise<void>((resolve, reject) => {
                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');

                    // Insert voucher
                    db.run(
                        `INSERT INTO vouchers (voucher_code, withdraw_phone_number, amount, status, time)
                         VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
                        [voucherCode, phone_number, withdrawAmount]
                    );

                    // Record transaction with correct column names
                    db.run(
                        `INSERT INTO transactions (phone_number, amount, type, status, reference, created_at)
                         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [phone_number, withdrawAmount, 'withdrawal', 'completed', voucherCode]
                    );

                    // Update player balances
                    db.run(
                        `UPDATE players 
                         SET withdrawable = withdrawable - ?, 
                             balance = balance - ?
                         WHERE id = ?`,
                        [withdrawAmount, withdrawAmount, player.id]
                    );

                    db.run('COMMIT', (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });

            db.close();

            res.json({
                success: true,
                message: 'Withdrawal successful',
                voucher_code: voucherCode
            });

        } catch (error) {
            db.close();
            console.error(error);
            res.status(500).json({
                success: false,
                message: 'Transaction failed'
            });
        }
    };

    // =========================
    // GET BY PHONE
    // =========================
    getVouchersByPhoneNumber = async (req: Request, res: Response) => {
        try {
            const { phone_number } = req.params;

            const vouchers = await voucherService.getVouchersByPhoneNumber(phone_number);

            res.json({ success: true, data: vouchers });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false });
        }
    };

    // =========================
    // MARK EXPIRED VOUCHERS
    // =========================
    markExpiredVouchers = async (req: Request, res: Response) => {
        const db = new sqlite3.Database('data/smart-betting.db');
        
        try {
            // Find all pending vouchers older than 24 hours
            const expiredVouchers: any[] = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT * FROM vouchers 
                     WHERE status = 'pending' 
                     AND datetime(time) < datetime('now', '-24 hours')`,
                    [],
                    (err, rows) => err ? reject(err) : resolve(rows || [])
                );
            });

            if (expiredVouchers.length === 0) {
                db.close();
                return res.status(200).json({
                    success: true,
                    message: 'No expired vouchers found',
                    data: {
                        modifiedCount: 0,
                        expiredCount: 0
                    }
                });
            }

            let modifiedCount = 0;

            // Mark each expired voucher as 'return'
            for (const voucher of expiredVouchers) {
                await new Promise<void>((resolve, reject) => {
                    db.run(
                        'UPDATE vouchers SET status = ? WHERE voucher_code = ? AND status = ?',
                        ['return', voucher.voucher_code, 'pending'],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                if (this.changes > 0) modifiedCount++;
                                resolve();
                            }
                        }
                    );
                });
            }

            db.close();

            res.status(200).json({
                success: true,
                message: `${modifiedCount} expired vouchers marked successfully`,
                data: {
                    modifiedCount: modifiedCount,
                    expiredCount: expiredVouchers.length,
                    expiredVouchers: expiredVouchers.map(v => ({
                        voucher_code: v.voucher_code,
                        amount: v.amount,
                        owner: v.withdraw_phone_number,
                        expired_at: v.time
                    }))
                }
            });

        } catch (error: any) {
            console.error('Error marking expired vouchers:', error);
            db.close();
            res.status(500).json({
                success: false,
                message: 'Failed to mark expired vouchers',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };

    // =========================
    // RETURN EXPIRED VOUCHERS
    // =========================
    returnExpiredVouchers = async (_req: Request, res: Response) => {
        const db = new sqlite3.Database('data/smart-betting.db');
        
        try {
            // Find expired vouchers (older than 24 hours and status = 'pending')
            const expiredVouchers: any[] = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT * FROM vouchers 
                     WHERE status = 'pending' 
                     AND datetime(time) < datetime('now', '-24 hours')`,
                    [],
                    (err, rows) => err ? reject(err) : resolve(rows || [])
                );
            });

            if (expiredVouchers.length === 0) {
                db.close();
                return res.json({
                    success: true,
                    message: 'No expired vouchers found',
                    returned_count: 0
                });
            }

            let returnedCount = 0;

            // Process each expired voucher
            for (const voucher of expiredVouchers) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        db.serialize(() => {
                            db.run('BEGIN TRANSACTION');

                            // Find the owner player
                            db.get(
                                'SELECT * FROM players WHERE phone_number = ?',
                                [voucher.withdraw_phone_number],
                                (err, player: any) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }

                                    if (!player) {
                                        // Player not found, just mark voucher as returned
                                        db.run(
                                            'UPDATE vouchers SET status = ?, deposit_phone_number = ? WHERE voucher_code = ?',
                                            ['return', voucher.withdraw_phone_number, voucher.voucher_code]
                                        );
                                        db.run('COMMIT', (err) => {
                                            if (err) reject(err);
                                            else resolve();
                                        });
                                        return;
                                    }

                                    // Get current balance for transaction recording
                                    const oldBalance = player.balance;
                                    const newBalance = oldBalance + voucher.amount;

                                    // Return amount to player's withdrawable balance
                                    db.run(
                                        `UPDATE players 
                                         SET balance = balance + ?, 
                                             withdrawable = withdrawable + ?
                                         WHERE id = ?`,
                                        [voucher.amount, voucher.amount, player.id]
                                    );

                                    // Record transaction for voucher return with correct column names
                                    db.run(
                                        `INSERT INTO transactions (phone_number, amount, type, status, reference, created_at)
                                         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                                        [voucher.withdraw_phone_number, voucher.amount, 'return', 'completed', voucher.voucher_code]
                                    );

                                    // Update voucher status and set deposit_phone_number to same as withdraw_phone_number
                                    db.run(
                                        `UPDATE vouchers 
                                         SET status = ?, 
                                             deposit_phone_number = ?
                                         WHERE voucher_code = ?`,
                                        ['return', voucher.withdraw_phone_number, voucher.voucher_code]
                                    );

                                    db.run('COMMIT', (err) => {
                                        if (err) reject(err);
                                        else resolve();
                                    });
                                }
                            );
                        });
                    });

                    returnedCount++;
                } catch (error) {
                    console.error(`Error processing voucher ${voucher.voucher_code}:`, error);
                }
            }

            db.close();

            res.json({
                success: true,
                message: `Successfully returned ${returnedCount} expired vouchers to their owners`,
                returned_count: returnedCount,
                processed_vouchers: expiredVouchers.map(v => ({
                    voucher_code: v.voucher_code,
                    amount: v.amount,
                    owner: v.withdraw_phone_number
                }))
            });

        } catch (error) {
            console.error('Error returning expired vouchers:', error);
            db.close();
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    };

    // =========================
    // GENERATE CODE
    // =========================
    private generateVoucherCode(): string {
        return Math.floor(10000 + Math.random() * 90000).toString();
    }
}

export const voucherController = new VoucherController();