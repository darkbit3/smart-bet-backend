import { dbManager } from './src/database/databaseManager';
import { AdminCashierManagementService } from './src/services/admin-cashier-management.service';
import { AdminUsersService } from './src/services/admin-users.service';

async function main() {
  try {
    console.log('Connecting to database...');
    await dbManager.connect();

    console.log('Refreshing cashier number_of_players from players table...');
    await AdminCashierManagementService.refreshAllCashierPlayerCounts();

    console.log('Refreshing admin no_cashier and no_player counts...');
    await AdminUsersService.refreshAllAdminCounts();

    console.log('Done: counts updated successfully.');
  } catch (error) {
    console.error('Error while refreshing counts:', error);
    process.exit(1);
  } finally {
    try {
      await dbManager.disconnect();
      console.log('Disconnected from database.');
    } catch (dberr) {
      console.error('Error while disconnecting database:', dberr);
    }
  }
}

main();
