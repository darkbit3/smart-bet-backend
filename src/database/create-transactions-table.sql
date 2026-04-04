-- Create Transactions table
CREATE TABLE IF NOT EXISTS Transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phonenumber TEXT NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    time DATETIME NOT NULL,
    old_balance REAL NOT NULL,
    new_balance REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster phone number lookups
CREATE INDEX IF NOT EXISTS idx_transactions_phonenumber ON Transactions(phonenumber);

-- Create index for time ordering
CREATE INDEX IF NOT EXISTS idx_transactions_time ON Transactions(time DESC);

-- Insert some sample data for testing
INSERT OR IGNORE INTO Transactions (phonenumber, method, status, time, old_balance, new_balance, created_at, updated_at) VALUES
('+251909090909', 'Deposit', 'Completed', '2026-03-25 12:58:50', 3000, 3300, '2026-03-25 12:58:50', '2026-03-25 12:58:50'),
('+251909090909', 'Bet', 'Lost', '2026-03-25 14:30:22', 3300, 3100, '2026-03-25 14:30:22', '2026-03-25 14:30:22'),
('+251909090909', 'Withdraw', 'Completed', '2026-03-25 16:15:33', 3100, 2900, '2026-03-25 16:15:33', '2026-03-25 16:15:33'),
('+251909090909', 'Deposit', 'Completed', '2026-03-26 09:20:15', 2900, 3200, '2026-03-26 09:20:15', '2026-03-26 09:20:15'),
('+251909090909', 'Bet', 'Won', '2026-03-26 11:45:30', 3200, 3500, '2026-03-26 11:45:30', '2026-03-26 11:45:30');
