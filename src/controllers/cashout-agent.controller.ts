import { Request, Response } from 'express';
import { CashoutAgentService } from '../services/cashout-agent.service';
import { ResponseHelper } from '../utils/response';
import { logger } from '../utils/logger';

export class CashoutAgentController {
  private cashoutService: CashoutAgentService;

  constructor(cashoutService: CashoutAgentService) {
    this.cashoutService = cashoutService;
  }

  /**
   * Create new cashout request
   */
  createCashoutRequest = async (req: Request, res: Response) => {
    try {
      const { withdraw_player, amount, cashier_name } = req.body;

      // Validate required fields
      if (!withdraw_player || !amount || !cashier_name) {
        return ResponseHelper.fail(res, 'Missing required fields: withdraw_player, amount, cashier_name', 400);
      }

      // Validate amount
      const withdrawalAmount = parseFloat(amount);
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        return ResponseHelper.fail(res, 'Invalid withdrawal amount', 400);
      }

      if (withdrawalAmount < 50) {
        return ResponseHelper.fail(res, 'Minimum withdrawal amount is $50', 400);
      }

      if (withdrawalAmount > 5000) {
        return ResponseHelper.fail(res, 'Maximum withdrawal amount is $5,000', 400);
      }

      logger.info(`Creating cashout request: ${withdrawalAmount} for player ${withdraw_player} by cashier ${cashier_name}`);

      const result = await this.cashoutService.createCashoutRequest({
        withdraw_player,
        amount: withdrawalAmount,
        cashier_name
      });

      if (result.success) {
        logger.info(`Cashout request created successfully with code: ${result.data.cashier_code}`);
        return ResponseHelper.success(res, result.data, result.message || 'Cashout request created successfully');
      } else {
        logger.error(`Failed to create cashout request: ${result.message}`);
        return ResponseHelper.fail(res, result.message || 'Failed to create cashout request', 500);
      }

    } catch (error: any) {
      logger.error('Create cashout request error:', error);
      return ResponseHelper.fail(res, error.message || 'Internal server error', 500);
    }
  };

  /**
   * Get cashout requests by cashier
   */
  getCashoutRequestsByCashier = async (req: Request, res: Response) => {
    try {
      const { cashier_name } = req.query;

      if (!cashier_name) {
        return ResponseHelper.fail(res, 'Cashier name is required', 400);
      }

      logger.info(`Fetching cashout requests for cashier: ${cashier_name}`);

      const result = await this.cashoutService.getCashoutRequestsByCashier(cashier_name as string);

      if (result.success) {
        logger.info(`Found ${result.data.length} cashout requests for cashier ${cashier_name}`);
        return ResponseHelper.success(res, { 
          requests: result.data,
          total: result.data.length
        }, 'Cashout requests retrieved successfully');
      } else {
        logger.error(`Failed to fetch cashout requests: ${result.message}`);
        return ResponseHelper.fail(res, result.message || 'Failed to fetch cashout requests', 500);
      }

    } catch (error: any) {
      logger.error('Get cashout requests error:', error);
      return ResponseHelper.fail(res, error.message || 'Internal server error', 500);
    }
  };

  /**
   * Get cashout request by code
   */
  getCashoutByCode = async (req: Request, res: Response) => {
    try {
      const { code } = req.params;

      if (!code) {
        return ResponseHelper.fail(res, 'Cashout code is required', 400);
      }

      logger.info(`Fetching cashout request by code: ${code}`);

      const result = await this.cashoutService.getCashoutByCode(code);

      if (result.success) {
        logger.info(`Cashout request found for code: ${code}`);
        return ResponseHelper.success(res, result.data, 'Cashout request found');
      } else {
        logger.error(`Failed to fetch cashout request: ${result.message}`);
        return ResponseHelper.fail(res, result.message || 'Cashout request not found', 404);
      }

    } catch (error: any) {
      logger.error('Get cashout by code error:', error);
      return ResponseHelper.fail(res, error.message || 'Internal server error', 500);
    }
  };

  /**
   * Update cashout status
   */
  updateCashoutStatus = async (req: Request, res: Response) => {
    try {
      const { id, status } = req.body;

      if (!id || !status) {
        return ResponseHelper.fail(res, 'Missing required fields: id, status', 400);
      }

      const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return ResponseHelper.fail(res, 'Invalid status. Must be: pending, completed, failed, cancelled', 400);
      }

      logger.info(`Updating cashout ${id} status to: ${status}`);

      const result = await this.cashoutService.updateCashoutStatus(parseInt(id), status);

      if (result.success) {
        logger.info(`Cashout ${id} status updated to: ${status}`);
        return ResponseHelper.success(res, null, result.message || 'Cashout status updated successfully');
      } else {
        logger.error(`Failed to update cashout status: ${result.message}`);
        return ResponseHelper.fail(res, result.message || 'Failed to update cashout status', 500);
      }

    } catch (error: any) {
      logger.error('Update cashout status error:', error);
      return ResponseHelper.fail(res, error.message || 'Internal server error', 500);
    }
  };

  /**
   * Complete cashout
   */
  completeCashout = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return ResponseHelper.fail(res, 'Cashout ID is required', 400);
      }

      logger.info(`Completing cashout: ${id}`);

      const result = await this.cashoutService.completeCashout(parseInt(id));

      if (result.success) {
        logger.info(`Cashout ${id} completed successfully`);
        return ResponseHelper.success(res, null, result.message || 'Cashout completed successfully');
      } else {
        logger.error(`Failed to complete cashout: ${result.message}`);
        return ResponseHelper.fail(res, result.message || 'Failed to complete cashout', 500);
      }

    } catch (error: any) {
      logger.error('Complete cashout error:', error);
      return ResponseHelper.fail(res, error.message || 'Internal server error', 500);
    }
  };
}
