import sqlite3 from 'sqlite3';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import path from 'path';

export class SQLiteDatabase {
  private db: sqlite3.Database | null = null;

  constructor() {
    this.db = null;
  }

  // Connect to SQLite database
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(process.cwd(), 'data', 'smart-betting.db');
      
      // Ensure data directory exists
      const fs = require('fs');
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('SQLite connection error:', err);
          reject(err);
        } else {
          logger.info('SQLite connected successfully');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  // Run database migrations
  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // Check if transactions table exists and needs migration
    const tableInfo = await this.get(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='transactions'
    `);

    if (tableInfo && tableInfo.sql) {
      // Check if the table has the old constraint (only withdrawal and deposit)
      if (tableInfo.sql.includes("CHECK(type IN ('withdrawal', 'deposit'))")) {
        logger.info('Running migration for transactions table...');
        
        // Disable foreign keys temporarily
        await this.run('PRAGMA foreign_keys=off');
        
        // Create backup
        await this.run('CREATE TABLE IF NOT EXISTS transactions_backup AS SELECT * FROM transactions');
        
        // Create new table with updated constraint
        await this.run(`
          CREATE TABLE transactions_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone_number TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal', 'return', 'bonus')),
            status TEXT DEFAULT 'completed',
            reference TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Copy data from old table to new table
        await this.run(`
          INSERT INTO transactions_new (id, phone_number, amount, type, status, reference, created_at)
          SELECT 
            id, 
            phone_number, 
            amount, 
            CASE 
              WHEN type = 'withdrawal' THEN 'withdrawal'
              WHEN type = 'deposit' THEN 'deposit'
              ELSE 'deposit'  -- Default fallback for any unexpected values
            END as type,
            status,
            reference,
            created_at
          FROM transactions
        `);
        
        // Drop old table
        await this.run('DROP TABLE transactions');
        
        // Rename new table
        await this.run('ALTER TABLE transactions_new RENAME TO transactions');
        
        // Recreate indexes
        await this.run('CREATE INDEX IF NOT EXISTS idx_transactions_phone_number ON transactions(phone_number)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');
        
        // Re-enable foreign keys
        await this.run('PRAGMA foreign_keys=on');
        
        logger.info('Transactions table migration completed successfully');
      }
    }
  }

  // Create database tables
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // Run migrations first
    await this.runMigrations();

    const tables = [
      // Players table (based on MongoDB Player model)
      `CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(30) UNIQUE NOT NULL,
        phone_number VARCHAR(15) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        last_password_change DATETIME DEFAULT CURRENT_TIMESTAMP,
        balance DECIMAL(10,2) DEFAULT 0.00,
        withdrawable DECIMAL(10,2) DEFAULT 0.00,
        non_withdrawable DECIMAL(10,2) DEFAULT 0.00,
        bonus_balance DECIMAL(10,2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'active',
        created_by VARCHAR(50) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Referral codes table
      `CREATE TABLE IF NOT EXISTS referral_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(20) UNIQUE NOT NULL,
        referrer_id INTEGER NOT NULL,
        referred_id INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        bonus_amount DECIMAL(10,2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referrer_id) REFERENCES players(id),
        FOREIGN KEY (referred_id) REFERENCES players(id)
      )`,

      // Keep existing users table for now (don't delete)
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100),
        phone_number VARCHAR(20),
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        balance DECIMAL(10,2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Bingo rooms table
      `CREATE TABLE IF NOT EXISTS bingo_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        prize_pool DECIMAL(10,2),
        ticket_price DECIMAL(10,2),
        max_players INTEGER,
        current_players INTEGER DEFAULT 0,
        next_game_time DATETIME,
        speed VARCHAR(20) DEFAULT 'Normal',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Bingo games table
      `CREATE TABLE IF NOT EXISTS bingo_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        game_number INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'waiting',
        prize_pool DECIMAL(10,2),
        winner_id INTEGER,
        winning_pattern VARCHAR(50),
        started_at DATETIME,
        ended_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES bingo_rooms(id),
        FOREIGN KEY (winner_id) REFERENCES players(id)
      )`,

      // Bingo tickets table
      `CREATE TABLE IF NOT EXISTS bingo_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        ticket_number INTEGER NOT NULL,
        numbers TEXT NOT NULL, -- JSON array of numbers
        is_winner BOOLEAN DEFAULT 0,
        prize_amount DECIMAL(10,2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES bingo_games(id),
        FOREIGN KEY (player_id) REFERENCES players(id)
      )`,

      // Betting events table
      `CREATE TABLE IF NOT EXISTS betting_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sport VARCHAR(50) NOT NULL,
        league VARCHAR(100),
        home_team VARCHAR(100) NOT NULL,
        away_team VARCHAR(100) NOT NULL,
        event_time DATETIME NOT NULL,
        status VARCHAR(20) DEFAULT 'upcoming',
        home_score INTEGER DEFAULT 0,
        away_score INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Betting odds table
      `CREATE TABLE IF NOT EXISTS betting_odds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        home_odds DECIMAL(5,2) NOT NULL,
        draw_odds DECIMAL(5,2),
        away_odds DECIMAL(5,2) NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES betting_events(id)
      )`,

      // Bets table
      `CREATE TABLE IF NOT EXISTS bets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        bet_type VARCHAR(20) NOT NULL, -- 'home', 'away', 'draw'
        odds DECIMAL(5,2) NOT NULL,
        stake DECIMAL(10,2) NOT NULL,
        potential_winnings DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        result VARCHAR(20),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES betting_events(id),
        FOREIGN KEY (player_id) REFERENCES players(id)
      )`,

      // Active sessions table for single device login
      `CREATE TABLE IF NOT EXISTS active_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        device_id TEXT NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        user_agent TEXT,
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )`,

      // Admin users table
      `CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_by VARCHAR(50) DEFAULT 'system',
        no_cashier INTEGER DEFAULT 0,
        no_player INTEGER DEFAULT 0,
        balance DECIMAL(15,2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Cashier transactions table
      `CREATE TABLE IF NOT EXISTS cashier_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cashier_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
        amount DECIMAL(10,2) NOT NULL,
        balance_before DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cashier_id) REFERENCES cashier_users(id),
        FOREIGN KEY (player_id) REFERENCES players(id)
      )`,

      // Vouchers table
      `CREATE TABLE IF NOT EXISTS vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_code VARCHAR(255) NOT NULL UNIQUE,
        withdraw_phone_number VARCHAR(20),
        deposit_phone_number VARCHAR(20),
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'return', 'completed')),
        time DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Cashout agent table
      `CREATE TABLE IF NOT EXISTS cashout_agent (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        withdraw_phonenumber VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        cashier_name VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        cashier_code VARCHAR(50) NOT NULL
      )`,

      // Transactions table (updated for cashout agent)
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal', 'return', 'bonus')),
        status TEXT DEFAULT 'completed',
        reference TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    // Create indexes for active_sessions table
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_active_sessions_player_id ON active_sessions(player_id)',
      'CREATE INDEX IF NOT EXISTS idx_active_sessions_device_id ON active_sessions(device_id)',
      'CREATE INDEX IF NOT EXISTS idx_active_sessions_is_active ON active_sessions(is_active)',
      // Indexes for admin_users table
      'CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username)',
      'CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status)',
      // Indexes for vouchers table
      'CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(voucher_code)',
      'CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status)',
      'CREATE INDEX IF NOT EXISTS idx_vouchers_withdraw_phone ON vouchers(withdraw_phone_number)',
      'CREATE INDEX IF NOT EXISTS idx_vouchers_deposit_phone ON vouchers(deposit_phone_number)',
      'CREATE INDEX IF NOT EXISTS idx_vouchers_time ON vouchers(time)',
      // Indexes for cashout_agent table
      'CREATE INDEX IF NOT EXISTS idx_cashout_agent_status ON cashout_agent(status)',
      'CREATE INDEX IF NOT EXISTS idx_cashout_agent_player ON cashout_agent(withdraw_phonenumber)',
      'CREATE INDEX IF NOT EXISTS idx_cashout_agent_created_at ON cashout_agent(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_cashout_agent_cashier ON cashout_agent(cashier_name, cashier_code)',
      // Indexes for transactions table
      'CREATE INDEX IF NOT EXISTS idx_transactions_phone_number ON transactions(phone_number)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference)'
    ];

    for (const indexSql of indexes) {
      await this.run(indexSql);
    }

    logger.info('Database tables created successfully');
  }

  // Execute SQL query
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.run(sql, params, function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this?.lastID || 0,
            changes: this?.changes || 0
          });
        }
      });
    });
  }

  // Get single row
  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get multiple rows
  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Close database connection
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          logger.info('SQLite connection closed');
          resolve();
        }
      });
    });
  }

  // Get database health status
  async getHealthStatus(): Promise<{ status: string; database: string }> {
    try {
      await this.get('SELECT 1');
      return {
        status: 'connected',
        database: 'SQLite'
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'SQLite'
      };
    }
  }

  // Get raw database instance (for legacy code)
  getRawDatabase(): sqlite3.Database | null {
    return this.db;
  }
}

// Export singleton instance
export const sqliteDB = new SQLiteDatabase();
