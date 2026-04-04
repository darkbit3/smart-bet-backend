-- Create reset_password table for password reset functionality
CREATE TABLE IF NOT EXISTS reset_password (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    reset_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, used, expired
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL, -- When the reset code expires
    used_at DATETIME NULL -- When the reset code was used
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reset_password_phone_number ON reset_password(phone_number);
CREATE INDEX IF NOT EXISTS idx_reset_password_status ON reset_password(status);
CREATE INDEX IF NOT EXISTS idx_reset_password_code ON reset_password(reset_code);
CREATE INDEX IF NOT EXISTS idx_reset_password_expires_at ON reset_password(expires_at);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_reset_password_updated_at
    AFTER UPDATE ON reset_password
    FOR EACH ROW
BEGIN
    UPDATE reset_password SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Clean up expired codes (optional - can be run periodically)
-- DELETE FROM reset_password WHERE expires_at < CURRENT_TIMESTAMP AND status = 'pending';
