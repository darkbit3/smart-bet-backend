-- Create cashier_transactions table for cashier operations
CREATE TABLE IF NOT EXISTS cashier_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cashiername TEXT NOT NULL,
  player_phone_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('deposit', 'withdraw')),
  old_cashier_balance REAL NOT NULL,
  new_cashier_balance REAL NOT NULL,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cashier_transactions_cashiername ON cashier_transactions(cashiername);
CREATE INDEX IF NOT EXISTS idx_cashier_transactions_player_phone ON cashier_transactions(player_phone_number);
CREATE INDEX IF NOT EXISTS idx_cashier_transactions_status ON cashier_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cashier_transactions_date ON cashier_transactions(date);
