import { sqliteDB } from './database/sqlite';
import { logger } from './utils/logger';
import bcrypt from 'bcrypt';

async function createCashierWithCorrectPassword() {
  try {
    // Initialize database first
    await sqliteDB.connect();
    
    // Hash the correct password
    const hashedPassword = await bcrypt.hash('Kale21513', 10);
    
    // Delete existing user if exists
    await sqliteDB.run('DELETE FROM cashier_users WHERE username = ?', ['kaleab']);
    
    // Create new user with correct password
    await sqliteDB.run(
      `INSERT INTO cashier_users 
       (username, password_hash, created_by, balance, number_of_players, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'kaleab',
        hashedPassword,
        'system',
        10000,
        0,
        'active'
      ]
    );

    logger.info('Sample cashier user created with correct password', {
      username: 'kaleab',
      balance: 10000
    });

    console.log('✅ Sample cashier user created:');
    console.log('Username: kaleab');
    console.log('Password: Kale21513');
    console.log('Balance: $10,000');

  } catch (error: any) {
    logger.error('Error creating sample cashier user:', error);
    console.error('❌ Error:', error.message);
  } finally {
    await sqliteDB.close();
  }
}

// Run the function
createCashierWithCorrectPassword().then(() => {
  console.log('🎉 Sample user creation completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Failed to create sample user:', error);
  process.exit(1);
});
