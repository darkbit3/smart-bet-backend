import { Request, Response } from 'express';
import { CashierPlayerListService } from '../services/cashier-playerlist.service';
import { ResponseHelper } from '../utils/response';
import { logger } from '../utils/logger';
import { catchAsync } from '../middleware/errorHandler';

export class CashierPlayerListController {
  
  // Get all players for the authenticated cashier
  static getPlayersByCashier = catchAsync(async (req: Request, res: Response) => {
    // Get cashier username from authenticated request
    const cashierUsername = (req as any).user?.username;
    
    if (!cashierUsername) {
      return ResponseHelper.fail(res, 'Cashier username not found', 400);
    }

    console.log(`Fetching players for cashier: ${cashierUsername}`);

    try {
      const players = await CashierPlayerListService.getPlayersByCashier(cashierUsername);
      
      logger.info(`Retrieved ${players.length} players for cashier: ${cashierUsername}`);
      
      return ResponseHelper.success(res, {
        players: players,
        total: players.length,
        cashier: cashierUsername
      }, 'Players retrieved successfully');
      
    } catch (error: any) {
      logger.error('Error fetching players by cashier:', error);
      return ResponseHelper.fail(res, error.message || 'Failed to fetch players', 500);
    }
  });

  // Get a specific player by ID (only if created by this cashier)
  static getPlayerById = catchAsync(async (req: Request, res: Response) => {
    const cashierUsername = (req as any).user?.username;
    const playerId = parseInt(req.params.id);
    
    if (!cashierUsername) {
      return ResponseHelper.fail(res, 'Cashier username not found', 400);
    }

    if (!playerId || isNaN(playerId)) {
      return ResponseHelper.fail(res, 'Valid player ID is required', 400);
    }

    try {
      const player = await CashierPlayerListService.getPlayerById(cashierUsername, playerId);
      
      if (!player) {
        return ResponseHelper.fail(res, 'Player not found or not created by you', 404);
      }

      logger.info(`Retrieved player ${playerId} for cashier: ${cashierUsername}`);
      
      return ResponseHelper.success(res, {
        player: player
      }, 'Player retrieved successfully');
      
    } catch (error: any) {
      logger.error('Error fetching player by ID:', error);
      return ResponseHelper.fail(res, error.message || 'Failed to fetch player', 500);
    }
  });

  // Search players for the authenticated cashier
  static searchPlayers = catchAsync(async (req: Request, res: Response) => {
    const cashierUsername = (req as any).user?.username;
    const searchTerm = req.query.q as string;
    
    if (!cashierUsername) {
      return ResponseHelper.fail(res, 'Cashier username not found', 400);
    }

    if (!searchTerm || searchTerm.length < 2) {
      return ResponseHelper.fail(res, 'Search term must be at least 2 characters long', 400);
    }

    try {
      const players = await CashierPlayerListService.searchPlayers(cashierUsername, searchTerm);
      
      logger.info(`Searched players for cashier: ${cashierUsername}, term: ${searchTerm}, found: ${players.length}`);
      
      return ResponseHelper.success(res, {
        players: players,
        total: players.length,
        searchTerm: searchTerm,
        cashier: cashierUsername
      }, 'Players searched successfully');
      
    } catch (error: any) {
      logger.error('Error searching players:', error);
      return ResponseHelper.fail(res, error.message || 'Failed to search players', 500);
    }
  });

  // Get cashier player statistics
  static getCashierStats = catchAsync(async (req: Request, res: Response) => {
    const cashierUsername = (req as any).user?.username;
    
    if (!cashierUsername) {
      return ResponseHelper.fail(res, 'Cashier username not found', 400);
    }

    try {
      const stats = await CashierPlayerListService.getCashierPlayerStats(cashierUsername);
      
      logger.info(`Retrieved stats for cashier: ${cashierUsername}`, stats);
      
      return ResponseHelper.success(res, {
        stats: stats,
        cashier: cashierUsername
      }, 'Statistics retrieved successfully');
      
    } catch (error: any) {
      logger.error('Error fetching cashier stats:', error);
      return ResponseHelper.fail(res, error.message || 'Failed to fetch statistics', 500);
    }
  });

  // Get players with pagination
  static getPlayersPaginated = catchAsync(async (req: Request, res: Response) => {
    const cashierUsername = (req as any).user?.username;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    
    if (!cashierUsername) {
      return ResponseHelper.fail(res, 'Cashier username not found', 400);
    }

    const offset = (page - 1) * limit;

    try {
      const sqlite = require('../database/databaseManager').dbManager.getSQLite();
      
      // Get the actual phone column name from the database
      const tableInfo = await sqlite.all('PRAGMA table_info(players)');
      const columnNames = (tableInfo || []).map((c: any) => String(c.name).toLowerCase());
      const phoneColumn = columnNames.includes('phone_number') ? 'phone_number' : 
                         (columnNames.includes('phonenumber') ? 'phonenumber' : 
                         (columnNames.includes('phonenumber') ? 'phoneNumber' : ''));
      
      let whereClause = 'WHERE created_by = ?';
      let params: any[] = [cashierUsername];

      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }

      const phoneExpr = phoneColumn ? `${phoneColumn} as phoneNumber` : `'' as phoneNumber`;
      const players = await sqlite.all(
        `SELECT 
          id, 
          username, 
          ${phoneExpr}, 
          balance, 
          withdrawable, 
          non_withdrawable, 
          bonus_balance as bonusBalance, 
          status, 
          created_at as createdAt, 
          created_by as createdBy
        FROM players 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalResult = await sqlite.get(
        `SELECT COUNT(*) as count FROM players ${whereClause}`,
        params
      );

      const total = totalResult?.count || 0;

      logger.info(`Retrieved paginated players for cashier: ${cashierUsername}, page: ${page}, total: ${total}`);
      
      return ResponseHelper.paginated(res, players, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      });
      
    } catch (error: any) {
      logger.error('Error fetching paginated players:', error);
      return ResponseHelper.fail(res, error.message || 'Failed to fetch players', 500);
    }
  });
}
