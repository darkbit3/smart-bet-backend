// Direct test of deposit functionality bypassing authentication
const sqlite3 = require('sqlite3').verbose();

// Create database connection
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database.');
});

// Test direct database operations
const testDirectDeposit = async () => {
  try {
    console.log('\n🧪 Testing Direct Database Operations...');
    
    // Get current balances
    const admin = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM admin_users WHERE username = ?", ['kaleab'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    const cashier = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM cashier_users WHERE username = ?", ['test_cashier'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    console.log('💰 Current Admin Balance:', admin.balance);
    console.log('💰 Current Cashier Balance:', cashier.balance);
    
    // Simulate deposit: Admin gives $500 to cashier
    const depositAmount = 500;
    const oldAdminBalance = admin.balance;
    const oldCashierBalance = cashier.balance;
    const newAdminBalance = oldAdminBalance - depositAmount;
    const newCashierBalance = oldCashierBalance + depositAmount;
    
    console.log(`\n📤 Processing deposit: $${depositAmount} from admin to cashier`);
    
    // Update admin balance
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE admin_users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?",
        [newAdminBalance, admin.username],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
    
    // Update cashier balance
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE cashier_users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?",
        [newCashierBalance, cashier.username],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
    
    // Create admin transaction record
    const transactionResult = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO admin_transactions (
          admin_username, cashier_username, transaction_type, amount,
          old_admin_balance, new_admin_balance, old_cashier_balance, new_cashier_balance,
          reference_id, description, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
      `, [
        admin.username, cashier.username, 'deposit', depositAmount,
        oldAdminBalance, newAdminBalance, oldCashierBalance, newCashierBalance,
        `DEP-${Date.now()}`, `Direct test deposit to ${cashier.username}`
      ], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    
    // Create cashier transaction record
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO cashier_transactions (
          cashiername, player_phone_number, status,
          old_cashier_balance, new_cashier_balance, date
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        cashier.username, 'SYSTEM', 'deposit',
        oldCashierBalance, newCashierBalance, new Date().toISOString()
      ], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    
    console.log('✅ Deposit completed successfully!');
    console.log('📄 Transaction ID:', transactionResult.lastID);
    
    // Verify new balances
    const newAdmin = await new Promise((resolve, reject) => {
      db.get("SELECT balance FROM admin_users WHERE username = ?", [admin.username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    const newCashier = await new Promise((resolve, reject) => {
      db.get("SELECT balance FROM cashier_users WHERE username = ?", [cashier.username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    console.log('\n💰 New Admin Balance:', newAdmin.balance);
    console.log('💰 New Cashier Balance:', newCashier.balance);
    
    // Show transaction history
    const transactions = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM admin_transactions ORDER BY created_at DESC LIMIT 3", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('\n📊 Recent Transactions:');
    transactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.transaction_type}: $${tx.amount} from ${tx.admin_username} to ${tx.cashier_username}`);
      console.log(`     Reference: ${tx.reference_id}`);
      console.log(`     Status: ${tx.status}`);
    });
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    db.close();
  }
};

// Run the test
testDirectDeposit();
