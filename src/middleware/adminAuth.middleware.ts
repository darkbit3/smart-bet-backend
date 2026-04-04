import { Request, Response, NextFunction } from 'express';
import { AdminLoginService } from '../services/admin-login.service';

/**
 * Admin authentication middleware
 * Verifies admin token and adds user info to request
 */
export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(440).json({ // 440 = Login Time Out (custom status)
        success: false,
        message: 'Admin authentication required.',
        requireLogin: true
      });
    }

    const adminUser = await AdminLoginService.getAdminByToken(token);
    
    if (!adminUser) {
      return res.status(440).json({ // 440 = Login Time Out (custom status)
        success: false,
        message: 'Invalid or expired admin token.',
        requireLogin: true
      });
    }

    if (adminUser.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated.'
      });
    }

    // Add admin user to request object
    (req as any).user = {
      username: adminUser.username,
      id: adminUser.id,
      balance: adminUser.balance
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error.'
    });
  }
};
