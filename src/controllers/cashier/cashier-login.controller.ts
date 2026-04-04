import { Request, Response } from 'express';
import { CashierLoginService } from '@/services/cashier-login.service';
import { ResponseHelper } from '@/utils/response';
import { logger } from '@/utils/logger';

export class CashierLoginController {
  private cashierLoginService = new CashierLoginService();

  // ✅ CREATE CASHIER USER
  async createCashierUser(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, confirm_password, created_by, initial_balance } = req.body;

      // Basic validation
      if (!username || !password || !created_by) {
        ResponseHelper.fail(res, 'Username, password, and created_by are required', 400);
        return;
      }

      if (password !== confirm_password) {
        ResponseHelper.fail(res, 'Passwords do not match', 400);
        return;
      }

      if (password.length < 6) {
        ResponseHelper.fail(res, 'Password must be at least 6 characters long', 400);
        return;
      }

      if (username.length < 3 || username.length > 50) {
        ResponseHelper.fail(res, 'Username must be between 3 and 50 characters', 400);
        return;
      }

      const result = await this.cashierLoginService.createCashierUser({
        username,
        password,
        confirm_password,
        created_by,
        initial_balance: initial_balance || 0
      });

      logger.info('Cashier user created successfully', { 
        cashierId: result.cashier_user.id, 
        username: result.cashier_user.username,
        created_by 
      });

      ResponseHelper.success(res, {
        cashier_user: result.cashier_user,
        tokens: result.tokens,
        message: 'Cashier user created successfully'
      }, 'Cashier user created successfully');

    } catch (error: any) {
      logger.error('Create cashier user error:', error);
      
      if (error.message.includes('username')) {
        ResponseHelper.fail(res, 'Username already taken. Please choose a different username.', 400);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to create cashier user', 400);
      }
    }
  }

  // ✅ CASHIER LOGIN
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      // Basic validation
      if (!username || !password) {
        ResponseHelper.fail(res, 'Username and password are required', 400);
        return;
      }

      const result = await this.cashierLoginService.login({ username, password });

      logger.info('Cashier login successful', { 
        cashierId: result.cashier_user.id, 
        username: result.cashier_user.username
      });

      ResponseHelper.success(res, {
        cashier_user: result.cashier_user,
        tokens: result.tokens,
        message: 'Cashier login successful'
      }, 'Login successful');

    } catch (error: any) {
      logger.error('Cashier login error:', error);
      ResponseHelper.fail(res, error.message || 'Login failed', 401);
    }
  }

  // ✅ GET CURRENT CASHIER USER
  async getCurrentCashierUser(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ResponseHelper.fail(res, 'Access token required', 401);
        return;
      }

      const token = authHeader.substring(7);
      const decoded = this.cashierLoginService.verifyToken(token);
      
      const cashierUser = await this.cashierLoginService.getCashierUserById(decoded.id);
      
      if (!cashierUser) {
        ResponseHelper.fail(res, 'Cashier user not found', 404);
        return;
      }

      ResponseHelper.success(res, {
        cashier_user: this.cashierLoginService.sanitizeCashierUser(cashierUser)
      }, 'Cashier user data retrieved successfully');

    } catch (error: any) {
      logger.error('Get cashier user error:', error);
      
      if (error.message === 'Invalid token') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to get cashier user data', 500);
      }
    }
  }

  // ✅ UPDATE CASHIER USER
  async updateCashierUser(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ResponseHelper.fail(res, 'Access token required', 401);
        return;
      }

      const token = authHeader.substring(7);
      const decoded = this.cashierLoginService.verifyToken(token);
      
      const { username, balance, number_of_players, status } = req.body;
      
      // Validate input
      if (!username && balance === undefined && number_of_players === undefined && !status) {
        ResponseHelper.fail(res, 'At least one field is required for update', 400);
        return;
      }

      if (username && (username.length < 3 || username.length > 50)) {
        ResponseHelper.fail(res, 'Username must be between 3 and 50 characters', 400);
        return;
      }

      if (balance !== undefined && balance < 0) {
        ResponseHelper.fail(res, 'Balance cannot be negative', 400);
        return;
      }

      if (number_of_players !== undefined && number_of_players < 0) {
        ResponseHelper.fail(res, 'Number of players cannot be negative', 400);
        return;
      }

      const updatedCashierUser = await this.cashierLoginService.updateCashierUser(decoded.id, {
        username,
        balance,
        number_of_players,
        status
      });

      logger.info('Cashier user updated', { cashierId: decoded.id });

      ResponseHelper.success(res, {
        cashier_user: this.cashierLoginService.sanitizeCashierUser(updatedCashierUser)
      }, 'Cashier user updated successfully');

    } catch (error: any) {
      logger.error('Update cashier user error:', error);
      
      if (error.message === 'Invalid token') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else if (error.message.includes('username')) {
        ResponseHelper.fail(res, 'Username already taken', 400);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to update cashier user', 500);
      }
    }
  }

  // ✅ GET ALL CASHIER USERS (Admin only)
  async getAllCashierUsers(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ResponseHelper.fail(res, 'Access token required', 401);
        return;
      }

      const token = authHeader.substring(7);
      const decoded = this.cashierLoginService.verifyToken(token);
      
      // Verify this is an admin (you might want to add an admin role check)
      const currentUser = await this.cashierLoginService.getCashierUserById(decoded.id);
      if (!currentUser || currentUser.username !== 'admin') {
        ResponseHelper.fail(res, 'Admin access required', 403);
        return;
      }
      
      const cashierUsers = await this.cashierLoginService.getAllCashierUsers();
      
      const sanitizedUsers = cashierUsers.map(user => 
        this.cashierLoginService.sanitizeCashierUser(user)
      );

      ResponseHelper.success(res, {
        cashier_users: sanitizedUsers,
        total: sanitizedUsers.length
      }, 'Cashier users retrieved successfully');

    } catch (error: any) {
      logger.error('Get all cashier users error:', error);
      
      if (error.message === 'Invalid token') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to get cashier users', 500);
      }
    }
  }

  // ✅ DELETE CASHIER USER (Admin only)
  async deleteCashierUser(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ResponseHelper.fail(res, 'Access token required', 401);
        return;
      }

      const token = authHeader.substring(7);
      const decoded = this.cashierLoginService.verifyToken(token);
      
      // Verify this is an admin
      const currentUser = await this.cashierLoginService.getCashierUserById(decoded.id);
      if (!currentUser || currentUser.username !== 'admin') {
        ResponseHelper.fail(res, 'Admin access required', 403);
        return;
      }

      const { id } = req.params;
      
      if (!id) {
        ResponseHelper.fail(res, 'Cashier user ID is required', 400);
        return;
      }

      // Don't allow admin to delete themselves
      if (parseInt(id) === decoded.id) {
        ResponseHelper.fail(res, 'Cannot delete your own account', 400);
        return;
      }

      await this.cashierLoginService.deleteCashierUser(parseInt(id));

      logger.info('Cashier user deleted', { 
        deletedById: decoded.id, 
        deletedId: id 
      });

      ResponseHelper.success(res, null, 'Cashier user deleted successfully');

    } catch (error: any) {
      logger.error('Delete cashier user error:', error);
      
      if (error.message === 'Invalid token') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to delete cashier user', 500);
      }
    }
  }

  // ✅ LOGOUT
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ResponseHelper.fail(res, 'Access token required', 401);
        return;
      }

      const token = authHeader.substring(7);
      const decoded = this.cashierLoginService.verifyToken(token);

      logger.info('Cashier logged out', { cashierId: decoded.id });

      ResponseHelper.success(res, null, 'Logout successful');

    } catch (error: any) {
      logger.error('Cashier logout error:', error);
      
      if (error.message === 'Invalid token') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to logout', 500);
      }
    }
  }

  // ✅ GET CASHIER BALANCE
  async getCashierBalance(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ResponseHelper.fail(res, 'Access token required', 401);
        return;
      }

      const token = authHeader.substring(7);
      const decoded = this.cashierLoginService.verifyToken(token);

      // Get cashier balance from database
      const { sqliteDB } = await import('@/database/sqlite');
      const cashier = await sqliteDB.get(
        'SELECT username, balance FROM cashier_users WHERE username = ?',
        [decoded.username]
      );

      if (!cashier) {
        ResponseHelper.fail(res, 'Cashier not found', 404);
        return;
      }

      ResponseHelper.success(res, {
        username: cashier.username,
        balance: cashier.balance || 0
      }, 'Cashier balance retrieved successfully');

    } catch (error: any) {
      logger.error('Get cashier balance error:', error);
      
      if (error.message === 'Invalid token') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to get cashier balance', 500);
      }
    }
  }

  // ✅ GET DASHBOARD BALANCE (Simplified for Dashboard)
  async getDashboardBalance(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ResponseHelper.fail(res, 'Access token required', 401);
        return;
      }

      const token = authHeader.substring(7);
      const decoded = this.cashierLoginService.verifyToken(token);

      // Get cashier balance from database
      const { sqliteDB } = await import('@/database/sqlite');
      const cashier = await sqliteDB.get(
        'SELECT balance FROM cashier_users WHERE username = ?',
        [decoded.username]
      );

      if (!cashier) {
        ResponseHelper.fail(res, 'Cashier not found', 404);
        return;
      }

      // Return simple balance for dashboard
      ResponseHelper.success(res, {
        balance: cashier.balance || 0
      }, 'Dashboard balance retrieved successfully');

    } catch (error: any) {
      logger.error('Get dashboard balance error:', error);
      
      if (error.message === 'Invalid token') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to get dashboard balance', 500);
      }
    }
  }

  // ✅ VERIFY TOKEN
  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ResponseHelper.fail(res, 'Access token required', 401);
        return;
      }

      const token = authHeader.substring(7);
      const decoded = this.cashierLoginService.verifyToken(token);
      
      ResponseHelper.success(res, {
        valid: true,
        decoded: decoded
      }, 'Token is valid');

    } catch (error: any) {
      logger.error('Verify token error:', error);
      
      if (error.message === 'Invalid token') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to verify token', 500);
      }
    }
  }

  // ✅ CHANGE PASSWORD
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ResponseHelper.fail(res, 'Access token required', 401);
        return;
      }

      const token = authHeader.substring(7);
      const decoded = this.cashierLoginService.verifyToken(token);
      
      const { current_password, new_password, confirm_password } = req.body;
      
      // Basic validation
      if (!current_password || !new_password || !confirm_password) {
        ResponseHelper.fail(res, 'Current password, new password, and confirm password are required', 400);
        return;
      }

      if (new_password !== confirm_password) {
        ResponseHelper.fail(res, 'New passwords do not match', 400);
        return;
      }

      if (new_password.length < 6) {
        ResponseHelper.fail(res, 'New password must be at least 6 characters long', 400);
        return;
      }

      // Change password
      await this.cashierLoginService.changePassword(decoded.id, current_password, new_password);

      logger.info('Cashier password changed successfully', { cashierId: decoded.id });

      ResponseHelper.success(res, null, 'Password changed successfully');

    } catch (error: any) {
      logger.error('Change password error:', error);
      
      if (error.message === 'Invalid token') {
        ResponseHelper.fail(res, 'Invalid or expired token', 401);
      } else if (error.message === 'Current password is incorrect') {
        ResponseHelper.fail(res, 'Current password is incorrect', 400);
      } else {
        ResponseHelper.fail(res, error.message || 'Failed to change password', 500);
      }
    }
  }
}
