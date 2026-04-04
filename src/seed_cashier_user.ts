import { sqliteDB } from './database/sqlite';
import { CashierLoginService } from './services/cashier-login.service';
import { logger } from './utils/logger';

async function createSampleCashierUser() {
  try {
    // Initialize database first
    await sqliteDB.connect();
    
    const cashierLoginService = new CashierLoginService();
    
    // Create sample cashier user
    await cashierLoginService.createCashierUser({
      username: 'kaleab',
      password: 'Kale@1513',
      confirm_password: 'Kale@1513',
      created_by: 'system',
      initial_balance: 10000
    });

    logger.info('Sample cashier user created successfully', {
      username: 'kaleab',
      balance: 10000
    });

    console.log('✅ Sample cashier user created:');
    console.log('Username: kaleab');
    console.log('Password: Kale@1513');
    console.log('Balance: $10,000');

  } catch (error: any) {
    if (error.message.includes('Username already taken')) {
      logger.info('Sample cashier user already exists');
      console.log('ℹ️ Sample cashier user already exists');
    } else {
      logger.error('Error creating sample cashier user:', error);
      console.error('❌ Error:', error.message);
    }
  }
}

// Run the function
createSampleCashierUser().then(() => {
  console.log('🎉 Sample user creation completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Failed to create sample user:', error);
  process.exit(1);
});
