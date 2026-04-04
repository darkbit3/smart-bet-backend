-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_by TEXT NOT NULL,
    no_cashier INTEGER DEFAULT 0,
    no_player INTEGER DEFAULT 0,
    balance REAL DEFAULT 0.0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample admin user
INSERT INTO admin_users (
    id, 
    username, 
    password_hash, 
    created_by, 
    no_cashier, 
    no_player, 
    balance, 
    status, 
    created_at, 
    updated_at
) VALUES (
    1,
    'kaleab',
    'hash(kale@1513)',  -- This should be replaced with actual hash
    'kaleab-super-admin',
    0,
    0,
    20000.0,
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_created_by ON admin_users(created_by);
