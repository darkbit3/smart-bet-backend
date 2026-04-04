-- Create temp_registrations table for registration OTP codes
-- Similar structure to reset_password table but for registration flow

CREATE TABLE IF NOT EXISTS temp_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    referral_code TEXT,
    reset_code TEXT NOT NULL,
    telegram_user_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used_at DATETIME
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_temp_registrations_phone_number ON temp_registrations(phone_number);
CREATE INDEX IF NOT EXISTS idx_temp_registrations_reset_code ON temp_registrations(reset_code);
CREATE INDEX IF NOT EXISTS idx_temp_registrations_status ON temp_registrations(status);
CREATE INDEX IF NOT EXISTS idx_temp_registrations_expires_at ON temp_registrations(expires_at);

-- Create trigger to auto-update updated_at field
CREATE TRIGGER IF NOT EXISTS update_temp_registrations_updated_at
    AFTER UPDATE ON temp_registrations
    FOR EACH ROW
BEGIN
    UPDATE temp_registrations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create trigger to auto-cleanup expired registrations (optional)
CREATE TRIGGER IF NOT EXISTS cleanup_expired_temp_registrations
    AFTER INSERT ON temp_registrations
    FOR EACH ROW
BEGIN
    DELETE FROM temp_registrations 
    WHERE status = 'pending' 
    AND expires_at < CURRENT_TIMESTAMP;
END;
