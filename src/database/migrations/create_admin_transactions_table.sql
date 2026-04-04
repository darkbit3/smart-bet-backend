-- Create admin_transactions table for admin-cashier operations
CREATE TABLE IF NOT EXISTS admin_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_username TEXT NOT NULL,
  cashier_username TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdraw')),
  amount REAL NOT NULL,
  old_admin_balance REAL NOT NULL,
  new_admin_balance REAL NOT NULL,
  old_cashier_balance REAL NOT NULL,
  new_cashier_balance REAL NOT NULL,
  reference_id TEXT UNIQUE,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_username) REFERENCES admin_users(username),
  FOREIGN KEY (cashier_username) REFERENCES cashier_users(username)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_transactions_admin_username ON admin_transactions(admin_username);
CREATE INDEX IF NOT EXISTS idx_admin_transactions_cashier_username ON admin_transactions(cashier_username);
CREATE INDEX IF NOT EXISTS idx_admin_transactions_type ON admin_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_admin_transactions_status ON admin_transactions(status);
CREATE INDEX IF NOT EXISTS idx_admin_transactions_created_at ON admin_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_transactions_reference_id ON admin_transactions(reference_id);

-- Create trigger to update updated_at column
CREATE TRIGGER IF NOT EXISTS update_admin_transactions_updated_at
AFTER UPDATE ON admin_transactions
BEGIN
  UPDATE admin_transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
