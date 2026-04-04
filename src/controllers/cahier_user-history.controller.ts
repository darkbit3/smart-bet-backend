import { Request, Response } from 'express';
import { CashierUserHistoryService } from '../services/cahier_user-history.service';

export class CashierUserHistoryController {
  static async searchUserHistory(req: Request, res: Response) {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      // Validate phone number format (basic validation)
      if (phoneNumber.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be at least 3 characters'
        });
      }

      const result = await CashierUserHistoryService.searchUserHistory(phoneNumber);
      
      if (!result.success) {
        return res.status(500).json(result);
      }
      
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Search user history controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
