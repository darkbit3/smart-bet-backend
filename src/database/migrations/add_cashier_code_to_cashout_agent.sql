-- Add cashier_code column to cashout_agent table
ALTER TABLE cashout_agent ADD COLUMN cashier_code TEXT NOT NULL DEFAULT '';

-- Update indexes to include the new column
DROP INDEX IF EXISTS idx_cashout_agent_cashier;
CREATE INDEX IF NOT EXISTS idx_cashout_agent_cashier ON cashout_agent(cashier_name, cashier_code);
