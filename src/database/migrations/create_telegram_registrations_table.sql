-- Create telegram_registrations table for registration OTP codes
-- Exact same structure as reset_password table

CREATE TABLE IF NOT EXISTS telegram_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    reset_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used_at DATETIME
);

-- Create indexes for performance (same as reset_password)
CREATE INDEX IF NOT EXISTS idx_telegram_registrations_phone_number ON telegram_registrations(phone_number);
CREATE INDEX IF NOT EXISTS idx_telegram_registrations_reset_code ON telegram_registrations(reset_code);
CREATE INDEX IF NOT EXISTS idx_telegram_registrations_status ON telegram_registrations(status);
CREATE INDEX IF NOT EXISTS idx_telegram_registrations_expires_at ON telegram_registrations(expires_at);

-- Create trigger to auto-update updated_at field (same as reset_password)
CREATE TRIGGER IF NOT EXISTS update_telegram_registrations_updated_at
    AFTER UPDATE ON telegram_registrations
    FOR EACH ROW
BEGIN
    UPDATE telegram_registrations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
