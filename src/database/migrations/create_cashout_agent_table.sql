-- Create cashout_agent table for tracking cashout operations
CREATE TABLE IF NOT EXISTS cashout_agent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  withdraw_player TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  cashier_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_cashout_agent_cashier ON cashout_agent(cashier_name);
CREATE INDEX IF NOT EXISTS idx_cashout_agent_status ON cashout_agent(status);
CREATE INDEX IF NOT EXISTS idx_cashout_agent_player ON cashout_agent(withdraw_player);
CREATE INDEX IF NOT EXISTS idx_cashout_agent_created_at ON cashout_agent(created_at);
