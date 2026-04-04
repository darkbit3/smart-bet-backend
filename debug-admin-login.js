// Debug admin login directly
const sqlite3 = require('sqlite3').verbose();

// Create database connection
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database.');
});

const debugAdminLogin = async () => {
  try {
    console.log('\n🔍 Debugging Admin Login...');
    
    const username = 'kaleab';
    const password = 'kale@1513';
    
    console.log('🔑 Input credentials:', { username, password });
    
    // Find admin user by username
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM admin_users WHERE username = ?", [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    console.log('👤 Database user:', user);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('🔐 Stored password hash:', user.password_hash);
    console.log('🔐 Input password:', password);
    console.log('🔐 Passwords match:', user.password_hash === password);
    
    // Check if user is active
    if (user.status !== 'active') {
      console.log('❌ User not active:', user.status);
      return;
    }
    
    console.log('✅ User is active');
    
    // Generate simple token (like the service does)
    const token = Buffer.from(`${user.username}:${Date.now()}`).toString('base64');
    console.log('🎫 Generated token:', token.substring(0, 30) + '...');
    
    console.log('✅ Login should be successful!');
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    db.close();
  }
};

// Run the debug
debugAdminLogin();
