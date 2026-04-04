import { Request, Response } from 'express';
import { AdminCashierListService, GetCashiersRequest } from '../services/admin-cashier-list.service';

export class AdminCashierListController {
  // Get cashiers by admin username
  static async getCashiersByAdmin(req: Request, res: Response) {
    try {
      const { created_by, username, status } = req.query;
      
      const request: GetCashiersRequest = {};
      
      if (created_by && typeof created_by === 'string') {
        request.created_by = created_by.trim();
      }
      
      if (username && typeof username === 'string') {
        request.username = username.trim();
      }
      
      if (status && typeof status === 'string') {
        request.status = status.trim();
      }
      
      const result = await AdminCashierListService.getCashiersByAdmin(request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Get cashiers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Initialize cashier table
  static async initializeCashierTable(req: Request, res: Response) {
    try {
      await AdminCashierListService.initializeCashierTable();
      
      res.status(200).json({
        success: true,
        message: 'Cashier table initialized successfully'
      });
    } catch (error) {
      console.error('Initialize cashier table error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
