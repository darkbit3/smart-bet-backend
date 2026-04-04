import { Request, Response } from 'express';
import { AdminCashierManagementService, CreateCashierRequest, SearchCashierRequest } from '../services/admin-cashier-management.service';

export class AdminCashierManagementController {
  // Create new cashier
  static async createCashier(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }
      
      if (typeof username !== 'string' || typeof password !== 'string') {
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
      
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }
      
      // Get admin username from token (simplified for demo)
      // Allow override from request body (for demo/testing) and default to 'system'
      const createdBy = (req.body.created_by || req.body.createdBy || 'system').toString().trim();
      
      const result = await AdminCashierManagementService.createCashier({
        username: username.trim(),
        password: password.trim(),
        created_by: createdBy
      });
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Create cashier error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Search cashiers
  static async searchCashiers(req: Request, res: Response) {
    try {
      const { username, created_by } = req.query;
      
      const searchData: SearchCashierRequest = {};
      
      if (username && typeof username === 'string') {
        searchData.username = username.trim();
      }
      
      if (created_by && typeof created_by === 'string') {
        searchData.created_by = created_by.trim();
      }
      
      const result = await AdminCashierManagementService.searchCashiers(searchData);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Search cashiers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Check username availability
  static async checkUsername(req: Request, res: Response) {
    try {
      const { username } = req.query;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Username is required'
        });
      }
      
      const result = await AdminCashierManagementService.checkUsernameExists(username.trim());
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.exists ? 'Username is not available' : 'Username is available',
          available: !result.exists,
          username: username.trim()
        });
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Check username error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Update cashier
  static async updateCashier(req: Request, res: Response) {
    try {
      const { username, ...updateData } = req.body;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username is required'
        });
      }
      
      const result = await AdminCashierManagementService.updateCashier(username.trim(), updateData);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update cashier error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Delete cashier
  static async deleteCashier(req: Request, res: Response) {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username is required'
        });
      }
      
      const result = await AdminCashierManagementService.deleteCashier(username.trim());
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Delete cashier error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Block/Unblock cashier
  static async toggleCashierStatus(req: Request, res: Response) {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username is required'
        });
      }
      
      const result = await AdminCashierManagementService.toggleCashierStatus(username.trim());
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Toggle cashier status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Withdraw from cashier
  static async withdrawFromCashier(req: Request, res: Response) {
    try {
      const { username, amount, description } = req.body;
      
      if (!username || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Username, amount, and positive amount are required'
        });
      }
      
      const result = await AdminCashierManagementService.withdrawFromCashier({
        username: username.trim(),
        amount: Number(amount),
        description: description?.trim()
      });
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
  
  // Initialize cashier table
  static async initializeCashierTable(req: Request, res: Response) {
    try {
      await AdminCashierManagementService.initializeCashierTable();
      
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

  // Get cashier by username
  static async getCashierByUsername(req: Request, res: Response) {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
      }

      if (typeof username !== 'string') {
        return res.status(400).json({ success: false, message: 'Username must be a string' });
      }

      const result = await AdminCashierManagementService.getCashierByUsername(username.trim());

      if (result.success) {
        return res.status(200).json({ 
          success: true, 
          data: result.cashier, 
          message: 'Cashier found successfully' 
        });
      } else {
        return res.status(404).json({ success: false, message: result.message || 'Cashier not found' });
      }
    } catch (error) {
      console.error('AdminCashierManagementController.getCashierByUsername error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
