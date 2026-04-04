import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class PlayerService {
    private db: sqlite3.Database;
    private jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

    constructor() {
        this.db = new sqlite3.Database('data/smart-betting.db');
    }

    async findByPhoneNumber(phoneNumber: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM players WHERE phone_number = ?',
                [phoneNumber],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });
    }

    async findById(id: number): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, phone_number, name, balance, withdrawable, non_withdrawable, status, created_at FROM players WHERE id = ?',
                [id],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });
    }

    async getPlayerById(id: number): Promise<any> {
        return this.findById(id);
    }

    async login(data: { phone_number: string; password: string; deviceInfo?: string; ipAddress?: string; userAgent?: string }): Promise<any> {
        const player = await this.findByPhoneNumber(data.phone_number);
        
        if (!player) {
            throw new Error('Player not found');
        }

        const isPasswordValid = await bcrypt.compare(data.password, player.password_hash || player.password);
        
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        const token = jwt.sign(
            { id: player.id, phone_number: player.phone_number },
            this.jwtSecret,
            { expiresIn: '24h' }
        );

        return {
            player: this.sanitizePlayer(player),
            tokens: { accessToken: token }
        };
    }

    verifyToken(token: string): any {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    sanitizePlayer(player: any): any {
        const { password_hash, password, ...sanitized } = player;
        return sanitized;
    }

    async createPlayer(data: { phone_number: string; name: string; password: string }): Promise<any> {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO players (phone_number, name, password, balance, withdrawable, non_withdrawable, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [data.phone_number, data.name, hashedPassword, 0, 0, 0, 'active'],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...data });
                }
            );
        });
    }

    async updateBalance(playerId: number, amount: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE players SET balance = balance + ? WHERE id = ?',
                [amount, playerId],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    async updateWithdrawable(playerId: number, amount: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE players SET withdrawable = withdrawable + ? WHERE id = ?',
                [amount, playerId],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    async getAllPlayers(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT id, phone_number, name, balance, withdrawable, non_withdrawable, status, created_at FROM players ORDER BY created_at DESC',
                [],
                (err, rows) => err ? reject(err) : resolve(rows)
            );
        });
    }

    async updatePlayer(id: number, data: { name?: string; status?: string }): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (data.name) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.status) {
            updates.push('status = ?');
            values.push(data.status);
        }

        if (updates.length === 0) return;

        values.push(id);
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE players SET ${updates.join(', ')} WHERE id = ?`,
                values,
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    async deletePlayer(id: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM players WHERE id = ?',
                [id],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    close() {
        this.db.close();
    }
}

export const playerService = new PlayerService();
