-- Create telegram_users table for storing telegram user information
CREATE TABLE IF NOT EXISTS telegram_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id INTEGER UNIQUE NOT NULL, -- Telegram user ID
    phone_number TEXT NOT NULL, -- User's phone number
    telegram_username TEXT NULL, -- Telegram username (optional)
    first_name TEXT NULL, -- User's first name
    last_name TEXT NULL, -- User's last name
    is_verified BOOLEAN DEFAULT FALSE, -- Whether user is verified
    is_active BOOLEAN DEFAULT TRUE, -- Whether user is active
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_interaction DATETIME NULL -- Last time user interacted with bot
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_user_id ON telegram_users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_phone_number ON telegram_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_telegram_users_is_active ON telegram_users(is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_users_is_verified ON telegram_users(is_verified);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_telegram_users_updated_at
    AFTER UPDATE ON telegram_users
    FOR EACH ROW
BEGIN
    UPDATE telegram_users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create trigger to update last_interaction
CREATE TRIGGER IF NOT EXISTS update_telegram_users_last_interaction
    AFTER UPDATE ON telegram_users
    FOR EACH ROW
BEGIN
    UPDATE telegram_users SET last_interaction = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
