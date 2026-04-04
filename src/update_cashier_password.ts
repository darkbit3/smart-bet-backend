import { sqliteDB } from './database/sqlite';
import { CashierLoginService } from './services/cashier-login.service';
import { logger } from './utils/logger';

async function updateSampleCashierUser() {
  try {
    // Initialize database first
    await sqliteDB.connect();
    
    // Update the existing user's password
    const hashedPassword = await new CashierLoginService()['hashPassword']('Kale21513');
    
    await sqliteDB.run(
      'UPDATE cashier_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
      [hashedPassword, 'kaleab']
    );

    logger.info('Sample cashier user password updated successfully', {
      username: 'kaleab',
      new_password: 'Kale21513'
    });

    console.log('✅ Sample cashier user password updated:');
    console.log('Username: kaleab');
    console.log('Password: Kale21513');
    console.log('Balance: $10,000');

  } catch (error: any) {
    if (error.message.includes('not found')) {
      logger.error('Sample cashier user not found');
      console.log('❌ Sample cashier user not found');
    } else {
      logger.error('Error updating sample cashier user:', error);
      console.error('❌ Error:', error.message);
    }
  } finally {
    await sqliteDB.close();
  }
}

// Run the function
updateSampleCashierUser().then(() => {
  console.log('🎉 Sample user password update completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Failed to update sample user password:', error);
  process.exit(1);
});
