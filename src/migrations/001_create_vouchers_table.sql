-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_code VARCHAR(255) NOT NULL UNIQUE,
    withdraw_phone_number VARCHAR(20),
    deposit_phone_number VARCHAR(20),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'return', 'completed')),
    time DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(voucher_code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_withdraw_phone ON vouchers(withdraw_phone_number);
CREATE INDEX IF NOT EXISTS idx_vouchers_deposit_phone ON vouchers(deposit_phone_number);
CREATE INDEX IF NOT EXISTS idx_vouchers_time ON vouchers(time);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_vouchers_updated_at
    AFTER UPDATE ON vouchers
    FOR EACH ROW
BEGIN
    UPDATE vouchers SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
