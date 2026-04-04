import { Router } from 'express';
import { playerService } from '@/services/player.service';
import { ResponseHelper } from '@/utils/response';
import { logger } from '@/utils/logger';
import { CASHIER_APP_CONFIG } from '../../app.config';

const router = Router();

// Handle preflight requests
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Cashier-specific authentication (allows multiple sessions)
router.post('/login', async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    // Basic validation
    if (!phone_number || !password) {
      return ResponseHelper.fail(res, 'Phone number and password are required', 400);
    }

    // For cashier, we don't enforce single device login
    const result = await playerService.login({ 
      phone_number, 
      password,
      deviceInfo: req.headers['user-agent'] || 'Cashier Device',
      ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || 'Cashier'
    });

    logger.info('Cashier login successful', { 
      playerId: result.player.id, 
      phone_number,
      device: 'cashier'
    });

    return ResponseHelper.success(res, {
      player: result.player,
      tokens: result.tokens,
      app_config: {
        name: CASHIER_APP_CONFIG.name,
        features: CASHIER_APP_CONFIG.features,
        session_timeout: CASHIER_APP_CONFIG.features.sessionTimeout,
        inactivity_timeout: CASHIER_APP_CONFIG.features.inactivityTimeout
      }
    }, 'Cashier login successful');

  } catch (error: any) {
    logger.error('Cashier login error:', error);
    return ResponseHelper.fail(res, error.message || 'Login failed', 401);
  }
});

// Get current player for cashier
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHelper.fail(res, 'Access token required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = playerService.verifyToken(token);
    
    const player = await playerService.getPlayerById(decoded.id);
    
    if (!player) {
      return ResponseHelper.fail(res, 'Player not found', 404);
    }

    return ResponseHelper.success(res, {
      player: playerService.sanitizePlayer(player),
      app_config: {
        name: CASHIER_APP_CONFIG.name,
        features: CASHIER_APP_CONFIG.features,
        single_device_login: CASHIER_APP_CONFIG.features.singleDeviceLogin
      }
    }, 'Cashier player data retrieved successfully');

  } catch (error: any) {
    logger.error('Cashier get player error:', error);
    
    if (error.message === 'Invalid token') {
      return ResponseHelper.fail(res, 'Invalid or expired token', 401);
    }
    
    return ResponseHelper.fail(res, error.message || 'Failed to get player data', 500);
  }
});

// Cashier logout (doesn't affect web app sessions)
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHelper.fail(res, 'Access token required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = playerService.verifyToken(token);
    
    // For cashier, we only logout the current session, not all sessions
    logger.info('Cashier logged out', { playerId: decoded.id });

    return ResponseHelper.success(res, null, 'Cashier logout successful');

  } catch (error: any) {
    logger.error('Cashier logout error:', error);
    
    if (error.message === 'Invalid token') {
      return ResponseHelper.fail(res, 'Invalid or expired token', 401);
    }
    
    return ResponseHelper.fail(res, error.message || 'Failed to logout', 500);
  }
});

export { router as cashierAuthRoutes };
