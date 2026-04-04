import { Router } from 'express';
import loginRoutes from './login.routes';
import registerRoutes from './register.routes';
import availabilityRoutes from './availability.routes';
import balanceRoutes from './balance.routes';
import userRoutes from './user.routes';
import passwordRoutes from './password.routes';
import transactionRoutes from './transaction.routes';
import balanceApiRoutes from './balance-api.routes';
import voucherRoutes from './voucher.routes';
import cashierDepositRoutes from './cashier_deposit.route';
import cashierTransactionAllRoutes from './cahier_transation_all.route';
import cashierUserHistoryRoutes from './cahier_user-history.route';
import adminUsersRoutes from './admin-users.route';
import adminLoginRoutes from './admin-login.route';
import adminBalanceRoutes from './admin_balance.route';
import adminPlayerDepositRoutes from './admin_player_deposit.route';
import adminPlayerWithdrawRoutes from './admin_player_withdraw.route';
import adminCashierManagementRoutes from './admin-cashier-management.route';
import adminCashierListRoutes from './admin-cashier-list.route';
import adminPlayerCheckerRoutes from './admin_player_checker.route';
import adminPlayerCreateRoutes from './admin_player_create.route';
import adminPlayerListRoutes from './admin_player_list.route';
import adminCashierDepositRoutes from './admin_cashier_deposit.route';
import adminCashierWithdrawRoutes from './admin_cashier_withdraw.route';
import adminTransactionsRoutes from './admin_transactions.route';
import telegramPhoneNumberRoutes from './telegram_phonenumber.route';
import playerResetPasswordRoutes from './player_reset_password.route';
import registrationRoutes from './registration.route';
import { createCashoutAgentRoutes } from './cashoutAgent.routes';
import bingoRoutes from './bingo.routes';
import { SQLiteDatabase } from '../database/sqlite';
import { dbManager } from '../database/databaseManager';

const router = Router();

// Mount login routes
router.use('/', loginRoutes);

// Mount register routes
router.use('/', registerRoutes);

// Mount availability routes
router.use('/availability', availabilityRoutes);

// Mount player routes (including balance)
router.use('/player', balanceRoutes);

// Mount user routes
router.use('/user', userRoutes);

// Mount password routes
router.use('/password', passwordRoutes);

// Mount transaction routes
router.use('/transaction', transactionRoutes);

// Mount balance API routes
router.use('/balance-api', balanceApiRoutes);

// Mount voucher routes
router.use('/voucher', voucherRoutes);

// Mount cashier deposit routes
router.use('/cashier/deposit', cashierDepositRoutes);

// Mount cashier transaction routes
router.use('/cashier/transactions', cashierTransactionAllRoutes);

// Mount cashier user history routes
router.use('/cashier/user-history', cashierUserHistoryRoutes);

// Mount admin users routes
router.use('/admin-users', adminUsersRoutes);

// Mount admin login routes
router.use('/admin-login', adminLoginRoutes);

// Mount admin balance routes
router.use('/admin-balance', adminBalanceRoutes);

// Mount admin player deposit routes
router.use('/admin-player-deposit', adminPlayerDepositRoutes);

// Mount admin player withdraw routes
router.use('/admin-player-withdraw', adminPlayerWithdrawRoutes);

// Mount admin cashier management routes
router.use('/admin-cashier-management', adminCashierManagementRoutes);

// Mount admin cashier list routes
router.use('/admin-cashier-list', adminCashierListRoutes);

// Mount admin player checker routes
router.use('/admin', adminPlayerCheckerRoutes);

// Mount admin player create routes
router.use('/admin', adminPlayerCreateRoutes);

// Mount admin player list routes
router.use('/admin', adminPlayerListRoutes);

// Mount admin cashier deposit routes
router.use('/admin-cashier-deposit', adminCashierDepositRoutes);

// Mount admin cashier withdraw routes
router.use('/admin-cashier-withdraw', adminCashierWithdrawRoutes);

// Mount admin transactions routes
router.use('/admin-transactions', adminTransactionsRoutes);

// Mount telegram phone number routes
router.use('/telegram-phonenumber', telegramPhoneNumberRoutes);

// Mount player reset password routes
router.use('/player-reset-password', playerResetPasswordRoutes);

// Mount registration routes
router.use('/registration', registrationRoutes);

// Mount bingo routes
router.use('/bingo', bingoRoutes);

// Mount cashout agent routes (will be initialized lazily)
const cashoutAgentRoutes = createCashoutAgentRoutes(null as any);
router.use('/cashout-agent', cashoutAgentRoutes);

// Set database reference when available
setTimeout(() => {
  try {
    if (dbManager.isDBConnected()) {
      const rawDb = dbManager.getSQLite().getRawDatabase();
      if (rawDb && (cashoutAgentRoutes as any).setDatabase) {
        (cashoutAgentRoutes as any).setDatabase(rawDb);
        console.log('✅ Cashout agent database reference set from routes');
      }
    }
  } catch (error) {
    console.error('❌ Failed to set cashout agent database reference:', error);
  }
}, 1000);

export { createCashoutAgentRoutes } from './cashoutAgent.routes';

export default router;
