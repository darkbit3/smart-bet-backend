import { Request, Response } from 'express';
import { AdminPlayerListService } from '../services/admin-player-list.service';

export class AdminPlayerListController {
  static async getPlayersByAdmin(req: Request, res: Response) {
    try {
      const adminUsername = (req as any).user?.username;
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

      if (!adminUsername) {
        return res.status(401).json({ success: false, message: 'Admin authentication required' });
      }

      const result = await AdminPlayerListService.getPlayersByAdmin({
        admin_username: adminUsername,
        status,
        search
      });

      if (result.success) {
        return res.status(200).json({ success: true, data: { players: result.players || [] }, message: result.message });
      }

      return res.status(500).json({ success: false, message: result.message });
    } catch (error) {
      console.error('AdminPlayerListController.getPlayersByAdmin error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async getPlayerByPhone(req: Request, res: Response) {
    try {
      const { phone_number } = req.body;

      if (!phone_number) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
      }

      if (typeof phone_number !== 'string') {
        return res.status(400).json({ success: false, message: 'Phone number must be a string' });
      }

      const result = await AdminPlayerListService.getPlayerByPhone(phone_number.trim());

      if (result.success) {
        return res.status(200).json({ success: true, data: { player: result.player }, message: result.message });
      }

      return res.status(500).json({ success: false, message: result.message });
    } catch (error) {
      console.error('AdminPlayerListController.getPlayerByPhone error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
