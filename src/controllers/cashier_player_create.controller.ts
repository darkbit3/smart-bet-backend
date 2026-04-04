import { Request, Response } from 'express';
import { CashierPlayerCreateService } from '../services/cashier_player_create.service';
import { CashierAuthenticatedRequest } from '../middleware/auth.middleware';

export class CashierPlayerCreateController {
  // Check username availability
  static async checkUsername(req: CashierAuthenticatedRequest, res: Response) {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username is required'
        });
      }

      const result = await CashierPlayerCreateService.checkUsernameAvailability(username);

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error: any) {
      console.error('❌ Check username error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check username availability'
      });
    }
  }

  // Check phone number availability
  static async checkPhone(req: CashierAuthenticatedRequest, res: Response) {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const result = await CashierPlayerCreateService.checkPhoneAvailability(phoneNumber);

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error: any) {
      console.error('❌ Check phone error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check phone availability'
      });
    }
  }

  // Create new player
  static async createPlayer(req: CashierAuthenticatedRequest, res: Response) {
    try {
      const { username, phoneNumber, password } = req.body;

      // Validate input
      if (!username || !phoneNumber || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, phone number, and password are required'
        });
      }

      // Validate phone number format (Ethiopian format)
      const cleanPhone = phoneNumber.replace(/\+251|\s/g, '');
      if (cleanPhone.length !== 9 || !cleanPhone.startsWith('9')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Ethiopian phone number format'
        });
      }

      // Get cashier username from authenticated user
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const createdBy = req.user.username;

      console.log('🎮 Creating player:', {
        username,
        phoneNumber,
        createdBy,
        timestamp: new Date().toISOString()
      });

      const result = await CashierPlayerCreateService.createPlayer({
        username,
        phoneNumber,
        password,
        createdBy
      });

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('❌ Create player error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create player'
      });
    }
  }
}
