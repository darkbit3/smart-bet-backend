// Script to hash admin password
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

async function hashAdminPassword() {
  try {
    console.log('🔐 Hashing admin password...');
    
    // Connect to database
    const db = new sqlite3.Database('./data/smart-betting.db', (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        return;
      }
      console.log('✅ Connected to SQLite database.');
    });

    // Get current admin user
    const admin = await new Promise((resolve, reject) => {
      db.get("SELECT username, password_hash FROM admin_users WHERE username = ?", ['kaleab'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log(`👤 Found admin: ${admin.username}`);
    console.log(`🔑 Current password: ${admin.password_hash}`);

    // Hash the password
    const plainPassword = 'Kale@1513';
    const saltRounds = 10;
    
    console.log('🔄 Hashing password...');
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    
    console.log(`✅ Password hashed: ${hashedPassword.substring(0, 30)}...`);

    // Update the password in database
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE admin_users SET password_hash = ? WHERE username = ?",
        [hashedPassword, 'kaleab'],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    console.log('✅ Password updated successfully in database!');

    // Verify the update
    const updatedAdmin = await new Promise((resolve, reject) => {
      db.get("SELECT username, password_hash FROM admin_users WHERE username = ?", ['kaleab'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    console.log(`🔍 Verification - New hashed password: ${updatedAdmin.password_hash.substring(0, 30)}...`);

    // Test the hash
    const isValid = await bcrypt.compare(plainPassword, updatedAdmin.password_hash);
    console.log(`✅ Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);

    // Close database
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed.');
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the hashing
hashAdminPassword();
