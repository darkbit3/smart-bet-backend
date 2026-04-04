import { Request, Response } from 'express';
import { AdminLoginService, AdminLoginRequest, AdminUser } from '../services/admin-login.service';

export class AdminLoginController {
  // Admin login
  static async adminLogin(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      
      console.log('🔍 Admin Login Debug - Request body:', { username, password: '***' });
      
      // Validate input
      if (!username || !password) {
        console.log('❌ Missing username or password');
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }
      
      if (typeof username !== 'string' || typeof password !== 'string') {
        console.log('❌ Invalid data types');
        return res.status(400).json({
          success: false,
          message: 'Invalid data types'
        });
      }
      
      // Validate username format
      if (username.length < 3 || username.length > 50) {
        console.log('❌ Invalid username length:', username.length);
        return res.status(400).json({
          success: false,
          message: 'Username must be between 3 and 50 characters'
        });
      }
      
      if (password.length < 6) {
        console.log('❌ Invalid password length:', password.length);
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }
      
      console.log('✅ Input validation passed, calling authenticateAdmin...');
      
      const result = await AdminLoginService.authenticateAdmin({
        username: username.trim(),
        password: password.trim()
      });
      
      console.log('🔍 Auth result:', { success: result.success, message: result.message });
      
      if (result.success) {
        console.log('✅ Login successful for user:', username);
        res.status(200).json(result);
      } else {
        console.log('❌ Login failed for user:', username, 'Reason:', result.message);
        res.status(401).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('💥 Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Get current admin user by token
  static async getCurrentAdmin(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }
      
      const user = await AdminLoginService.getAdminByToken(token);
      
      if (user) {
        res.status(200).json({
          success: true,
          message: 'Admin user retrieved successfully',
          data: user
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    } catch (error) {
      console.error('Get current admin error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Update admin balance
  static async updateAdminBalance(req: Request, res: Response) {
    try {
      const { username, balance } = req.body;
      
      if (!username || balance === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Username and balance are required'
        });
      }
      
      if (typeof balance !== 'number' || balance < 0) {
        return res.status(400).json({
          success: false,
          message: 'Balance must be a positive number'
        });
      }
      
      const result = await AdminLoginService.updateAdminBalance(username.trim(), Number(balance));
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update admin balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Initialize admin table
  static async initializeAdminTable(req: Request, res: Response) {
    try {
      await AdminLoginService.initializeAdminTable();
      
      res.status(200).json({
        success: true,
        message: 'Admin table initialized successfully'
      });
    } catch (error) {
      console.error('Initialize admin table error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
