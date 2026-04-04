// Simple test script to verify admin transaction functionality
const sqlite3 = require('sqlite3').verbose();

// Create database connection
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database.');
});

// Test admin_transactions table structure
db.all("PRAGMA table_info(admin_transactions)", (err, rows) => {
  if (err) {
    console.error('Error getting table info:', err.message);
    return;
  }
  
  if (rows.length === 0) {
    console.log('❌ admin_transactions table does not exist');
  } else {
    console.log('✅ admin_transactions table exists with columns:');
    rows.forEach(row => {
      console.log(`  - ${row.name} (${row.type})`);
    });
  }
});

// Test admin_users table balance column
db.all("PRAGMA table_info(admin_users)", (err, rows) => {
  if (err) {
    console.error('Error getting admin_users table info:', err.message);
    return;
  }
  
  const balanceColumn = rows.find(row => row.name === 'balance');
  if (balanceColumn) {
    console.log('✅ admin_users table has balance column');
  } else {
    console.log('❌ admin_users table missing balance column');
  }
});

// Test cashier_users table balance column
db.all("PRAGMA table_info(cashier_users)", (err, rows) => {
  if (err) {
    console.error('Error getting cashier_users table info:', err.message);
    return;
  }
  
  const balanceColumn = rows.find(row => row.name === 'balance');
  if (balanceColumn) {
    console.log('✅ cashier_users table has balance column');
  } else {
    console.log('❌ cashier_users table missing balance column');
  }
});

// Sample data test
console.log('\n📊 Sample admin data:');
db.all("SELECT username, balance FROM admin_users LIMIT 3", (err, rows) => {
  if (err) {
    console.error('Error querying admin users:', err.message);
    return;
  }
  
  rows.forEach(row => {
    console.log(`  Admin: ${row.username}, Balance: $${row.balance}`);
  });
});

console.log('\n💰 Sample cashier data:');
db.all("SELECT username, balance, created_by FROM cashier_users LIMIT 3", (err, rows) => {
  if (err) {
    console.error('Error querying cashier users:', err.message);
    return;
  }
  
  rows.forEach(row => {
    console.log(`  Cashier: ${row.username}, Balance: $${row.balance}, Created by: ${row.created_by}`);
  });
});

// Close database connection
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\n✅ Database connection closed.');
    }
  });
}, 1000);
