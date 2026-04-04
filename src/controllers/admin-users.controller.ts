import { Request, Response } from 'express';
import { AdminUsersService, AdminUser } from '../services/admin-users.service';

export class AdminUsersController {
  // Create new admin user
  static async createAdminUser(req: Request, res: Response) {
    try {
      const { username, password_hash, created_by, no_cashier, no_player, balance, status } = req.body;
      
      // Validate required fields
      if (!username || !password_hash || !created_by) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: username, password_hash, created_by'
        });
      }
      
      // Validate data types
      if (typeof username !== 'string' || typeof password_hash !== 'string' || typeof created_by !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid data types'
        });
      }
      
      // Validate username format
      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Username must be between 3 and 50 characters'
        });
      }
      
      const result = await AdminUsersService.createAdminUser({
        username: username.trim(),
        password_hash: password_hash.trim(),
        created_by: created_by.trim(),
        no_cashier: Number(no_cashier || 0),
        no_player: Number(no_player || 0),
        balance: Number(balance) || 0,
        status: status || 'active'
      });
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in createAdminUser:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Get all admin users
  static async getAllAdminUsers(req: Request, res: Response) {
    try {
      const users = await AdminUsersService.getAllAdminUsers();
      
      res.status(200).json({
        success: true,
        message: 'Admin users retrieved successfully',
        data: users
      });
    } catch (error) {
      console.error('Error in getAllAdminUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Get admin user by ID
  static async getAdminUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      const user = await AdminUsersService.getAdminUserByUsername(id);
      
      if (user) {
        res.status(200).json({
          success: true,
          message: 'Admin user retrieved successfully',
          data: user
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Admin user not found'
        });
      }
    } catch (error) {
      console.error('Error in getAdminUserById:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Update admin user
  static async updateAdminUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      const result = await AdminUsersService.updateAdminUser(Number(id), updates);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in updateAdminUser:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Delete admin user
  static async deleteAdminUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      const result = await AdminUsersService.deleteAdminUser(Number(id));
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in deleteAdminUser:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Initialize admin users table
  static async initializeTable(req: Request, res: Response) {
    try {
      await AdminUsersService.initializeTable();
      
      res.status(200).json({
        success: true,
        message: 'Admin users table initialized successfully'
      });
    } catch (error) {
      console.error('Error initializing admin users table:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
