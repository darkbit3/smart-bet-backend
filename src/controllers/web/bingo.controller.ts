import { Request, Response } from 'express';
import { ResponseHelper } from '@/utils/response';
import { catchAsync } from '@/middleware/errorHandler';
import axios from 'axios';

// Bingo player connection controller
export class BingoController {
  // Handle player connection from smart bet bingo page
  static handlePlayerConnect = catchAsync(async (req: Request, res: Response) => {
    const { playerId, username, phone_number, source } = req.body;

    console.log('🎯 Backend: Player connection request from bingo page:', {
      playerId,
      username,
      phone_number,
      source,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!playerId || !username || !phone_number) {
      return ResponseHelper.fail(res, 'Missing required fields: playerId, username, phone_number', 400);
    }

    try {
      // Forward player data to bigserver
      const bigServerResponse = await axios.post('http://localhost:3000/api/v1/player/update-balance', {
        playerId: playerId,
        balance: 0, // Will be updated by bigserver with actual balance
        username: username,
        phone_number: phone_number,
        source: 'smart_bet_bingo_page',
        action: 'player_connect'
      }, {
        headers: {
          'X-API-Key': process.env.BIGSERVER_API_KEY || 'bsk_2026_secure_inter_service_key_kalea_bingo_system',
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      console.log('✅ Backend: Player data forwarded to bigserver successfully');

      // Get current player balance from database
      const playerBalance = await getPlayerBalance(playerId);

      // Send balance to bigserver for synchronization
      if (playerBalance) {
        await axios.post('http://localhost:3000/api/v1/player/update-balance', {
          playerId: playerId,
          balance: playerBalance.balance,
          withdrawable: playerBalance.withdrawable,
          non_withdrawable: playerBalance.non_withdrawable,
          bonus_balance: playerBalance.bonus_balance
        }, {
          headers: {
            'X-API-Key': process.env.BIGSERVER_API_KEY || 'bsk_2026_secure_inter_service_key_kalea_bingo_system',
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        console.log('💰 Backend: Player balance synchronized with bigserver');
      }

      return ResponseHelper.success(res, {
        playerId,
        username,
        phone_number,
        source,
        connected: true,
        balance: playerBalance,
        message: 'Player connected to bingo system successfully',
        timestamp: new Date().toISOString()
      }, 'Player connection successful');

    } catch (error: any) {
      console.error('❌ Backend: Failed to connect player to bingo system:', error.message);
      
      return ResponseHelper.fail(res, 
        `Failed to connect player to bingo system: ${error.message}`, 
        500
      );
    }
  });

  // Get bingo game status
  static getBingoStatus = catchAsync(async (req: Request, res: Response) => {
    try {
      // Check bigserver status
      const bigServerResponse = await axios.get('http://localhost:3000/public-health', { timeout: 3000 });
      
      // Check bingo frontend status (indirectly)
      const bingoFrontendAvailable = bigServerResponse.status === 200;

      return ResponseHelper.success(res, {
        bingoFrontendAvailable,
        bigServerAvailable: bigServerResponse.status === 200,
        backendAvailable: true,
        message: bingoFrontendAvailable ? 'Bingo system is operational' : 'Bingo system is partially available',
        timestamp: new Date().toISOString()
      }, 'Bingo status retrieved');

    } catch (error: any) {
      console.error('❌ Backend: Failed to get bingo status:', error.message);
      
      return ResponseHelper.success(res, {
        bingoFrontendAvailable: false,
        bigServerAvailable: false,
        backendAvailable: true,
        message: 'Bingo system is currently unavailable',
        error: error.message,
        timestamp: new Date().toISOString()
      }, 'Bingo status retrieved');
    }
  });
}

// Helper function to get player balance from database
async function getPlayerBalance(playerId: number) {
  try {
    // Import sqliteDB dynamically to avoid circular dependencies
    const { sqliteDB } = await import('@/database/sqlite');
    
    const player = await sqliteDB.get(
      `SELECT 
        balance,
        withdrawable,
        non_withdrawable,
        bonus_balance,
        updated_at
      FROM players 
      WHERE id = ? AND status = 'active'`,
      [playerId]
    );

    if (!player) {
      console.warn(`⚠️ Backend: Player ${playerId} not found or inactive`);
      return null;
    }

    return {
      balance: player.balance || 0,
      withdrawable: player.withdrawable || 0,
      non_withdrawable: player.non_withdrawable || 0,
      bonus_balance: player.bonus_balance || 0,
      last_updated: player.updated_at
    };

  } catch (error) {
    console.error('❌ Backend: Error getting player balance:', error);
    return null;
  }
}

