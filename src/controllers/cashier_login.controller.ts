import { Request, Response } from 'express';
import { CashierLoginService } from '../services/cashier_login.service';
import { generateToken } from '../utils/jwt';

export class CashierLoginController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }
      
      // Call login service
      const result = await CashierLoginService.login(username, password);
      
      if (!result.success) {
        return res.status(401).json(result);
      }
      
      // Generate JWT token
      const token = generateToken({
        id: result.data.cashier.id,
        username: result.data.cashier.username,
        role: 'cashier'
      });
      
      // Send response with token
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          cashier: result.data.cashier,
          token: token
        }
      });
      
    } catch (error) {
      console.error('Login controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
