import { Request, Response } from 'express';
import { CashoutAgentService, CashoutAgentRequest } from '../services/cashoutAgent.service';
import { Database } from 'sqlite3';

export class CashoutAgentController {
  constructor(private cashoutAgentService: CashoutAgentService) {}

  /**
   * Process cashout agent withdrawal request
   */
  async processCashoutRequest(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔴 Cashout request received:', req.body);
      const { withdraw_player, amount, cashier_name } = req.body;

      // Validate input
      if (!withdraw_player || !amount || !cashier_name) {
        res.status(400).json({
          status: 'error',
          message: 'Missing required fields: withdraw_player, amount, cashier_name'
        });
        return;
      }

      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          status: 'error',
          message: 'Amount must be a positive number'
        });
        return;
      }

      if (amount < 50) {
        res.status(400).json({
          status: 'error',
          message: 'Minimum withdrawal amount is $50'
        });
        return;
      }

      if (amount > 5000) {
        res.status(400).json({
          status: 'error',
          message: 'Maximum withdrawal amount is $5,000'
        });
        return;
      }

      const request: CashoutAgentRequest = {
        withdraw_player,
        amount,
        cashier_name
      };

      const result = await this.cashoutAgentService.processCashoutRequest(request);

      if (result.success) {
        res.status(200).json({
          status: 'success',
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          status: 'error',
          message: result.message
        });
      }

    } catch (error) {
      console.error('Cashout agent request error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get all cashout requests (for cashier dashboard)
   */
  async getCashoutRequests(req: Request, res: Response): Promise<void> {
    try {
      const { cashier_name } = req.query;
      
      const requests = await this.cashoutAgentService.getCashoutRequests(
        cashier_name as string
      );

      res.status(200).json({
        status: 'success',
        data: requests
      });

    } catch (error) {
      console.error('Get cashout requests error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update cashout request status
   */
  async updateCashoutStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, cashier_name } = req.body;

      if (!id || !status || !cashier_name) {
        res.status(400).json({
          status: 'error',
          message: 'Missing required fields: id, status, cashier_name'
        });
        return;
      }

      const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid status. Must be one of: pending, processing, completed, cancelled'
        });
        return;
      }

      const updated = await this.cashoutAgentService.updateCashoutStatus(
        parseInt(id),
        status,
        cashier_name
      );

      if (updated) {
        res.status(200).json({
          status: 'success',
          message: 'Cashout status updated successfully'
        });
      } else {
        res.status(404).json({
          status: 'error',
          message: 'Cashout request not found or unauthorized'
        });
      }

    } catch (error) {
      console.error('Update cashout status error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}
