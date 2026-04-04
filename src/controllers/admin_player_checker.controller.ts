import { Request, Response } from 'express';
import { AdminPlayerCheckerService } from '../services/admin_player_checker.service';

export class AdminPlayerCheckerController {
  // Check if username or phone number exists
  static async checkPlayer(req: Request, res: Response) {
    try {
      const { username, phone_number } = req.body;

      // Validate that at least one field is provided
      if (!username && !phone_number) {
        return res.status(400).json({
          success: false,
          message: 'At least one of username or phone_number must be provided'
        });
      }

      // Validate data types if provided
      if (username && typeof username !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Username must be a string'
        });
      }

      if (phone_number && typeof phone_number !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be a string'
        });
      }

      const result = await AdminPlayerCheckerService.checkPlayerExists(
        username?.trim(),
        phone_number?.trim()
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in checkPlayer:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}