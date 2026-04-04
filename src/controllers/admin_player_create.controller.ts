import { Request, Response } from 'express';
import { AdminPlayerCreateService } from '../services/admin_player_create.service';

export class AdminPlayerCreateController {
  // Create new player
  static async createPlayer(req: Request, res: Response) {
    try {
      const { username, phone, password, confirm_password, referral_code, admin_username } = req.body;

      // Validate required fields
      if (!username || !phone || !password || !confirm_password || !admin_username) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: username, phone, password, confirm_password, admin_username'
        });
      }

      // Validate password confirmation
      if (password !== confirm_password) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      // Validate username format
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Username must be between 3 and 30 characters'
        });
      }

      // Validate phone number format (should be 9 digits)
      if (!/^\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 9 digits'
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      const result = await AdminPlayerCreateService.createPlayer({
        username: username.trim(),
        phone_number: `+251${phone}`,
        password: password,
        created_by: admin_username.trim(),
        referral_code: referral_code?.trim()
      });

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in createPlayer:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}