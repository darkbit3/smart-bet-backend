import { Router } from 'express';
import { playerService } from '@/services/player.service';
import { referralService } from '@/services/referralService';
import { ResponseHelper } from '@/utils/response';
import { logger } from '@/utils/logger';
import { sqliteDB } from '@/database/sqlite';
import { WEB_APP_CONFIG } from '../../app.config';

const router = Router();

// Handle preflight requests
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Check referral code
router.get('/referral-check', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return ResponseHelper.fail(res, 'Referral code is required', 400);
    }

    const referral = await referralService.getReferralByCode(code as string);
    
    if (!referral) {
      return ResponseHelper.fail(res, 'Invalid referral code', 404);
    }

    return ResponseHelper.success(res, {
      referral: {
        id: referral.id,
        referrer_id: referral.referrer_id,
        bonus_amount: referral.bonus_amount
      }
    }, 'Referral code is valid');

  } catch (error: any) {
    logger.error('Referral check error:', error);
    return ResponseHelper.fail(res, error.message || 'Failed to check referral code', 500);
  }
});

// Register player
router.post('/register', async (req, res) => {
  try {
    const { username, phone_number, password, confirm_password, referral_code } = req.body;

    // Basic validation
    if (!username || !phone_number || !password || !confirm_password) {
      return ResponseHelper.fail(res, 'All fields are required', 400);
    }

    if (password !== confirm_password) {
      return ResponseHelper.fail(res, 'Passwords do not match', 400);
    }

    if (password.length < 6) {
      return ResponseHelper.fail(res, 'Password must be at least 6 characters long', 400);
    }

    if (username.length < 3 || username.length > 30) {
      return ResponseHelper.fail(res, 'Username must be between 3 and 30 characters', 400);
    }

    // Validate phone number format (Ethiopian format)
    const phoneRegex = /^(?:\+251|0)?[9]\d{8}$/;
    if (!phoneRegex.test(phone_number)) {
      return ResponseHelper.fail(res, 'Invalid Ethiopian phone number format', 400);
    }

    // Check if referral code exists (if provided)
    let referralData = null;
    if (referral_code) {
      referralData = await referralService.getReferralByCode(referral_code);
      if (!referralData) {
        return ResponseHelper.fail(res, 'Invalid referral code', 400);
      }
    }

    const result = await playerService.register({
      username,
      phone_number,
      password,
      confirm_password,
      referral_code: referralData?.code
    });

    logger.info('Player registered successfully', { 
      playerId: result.player.id, 
      username: result.player.username,
      phone_number 
    });

    return ResponseHelper.success(res, {
      player: result.player,
      tokens: result.tokens,
      referral_bonus: referralData ? referralData.bonus_amount : 0
    }, 'Registration successful');

  } catch (error: any) {
    logger.error('Player registration error:', error);
    
    if (error.message.includes('username')) {
      return ResponseHelper.fail(res, 'Username already taken. Please choose a different username.', 400);
    }
    if (error.message.includes('phone_number')) {
      return ResponseHelper.fail(res, 'Phone number already registered. Please use a different number.', 400);
    }
    if (error.message.includes('referral')) {
      return ResponseHelper.fail(res, 'Invalid referral code', 400);
    }
    
    return ResponseHelper.fail(res, error.message || 'Registration failed', 400);
  }
});

// Login player with single device support
router.post('/login', async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    // Basic validation
    if (!phone_number || !password) {
      return ResponseHelper.fail(res, 'Phone number and password are required', 400);
    }

    // Extract device information
    const deviceInfo = {
      deviceInfo: req.headers['user-agent'] || 'Unknown Device',
      ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || 'Unknown'
    };

    const result = await playerService.login({ 
      phone_number, 
      password, 
      ...deviceInfo 
    });

    logger.info('Player logged in successfully', { 
      playerId: result.player.id, 
      phone_number,
      hasExistingSession: result.hasExistingSession
    });

    // Return different response based on whether there was an existing session
    if (result.hasExistingSession) {
      return ResponseHelper.success(res, {
        player: result.player,
        tokens: result.tokens,
        hasExistingSession: true,
        existingSessionInfo: result.existingSessionInfo,
        message: 'You were logged in from another device. That session has been deactivated.'
      }, 'Login successful - previous session deactivated');
    } else {
      return ResponseHelper.success(res, {
        player: result.player,
        tokens: result.tokens,
        hasExistingSession: false
      }, 'Login successful');
    }

  } catch (error: any) {
    logger.error('Player login error:', error);
    return ResponseHelper.fail(res, error.message || 'Login failed', 401);
  }
});

// Get current player (protected)
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

    // Get active sessions for this player
    const activeSessions = await playerService.getActiveSessions(player.id);
    
    return ResponseHelper.success(res, {
      player: playerService.sanitizePlayer(player),
      active_sessions: activeSessions,
      session_config: {
        single_device_login: WEB_APP_CONFIG.features.singleDeviceLogin,
        session_timeout: WEB_APP_CONFIG.features.sessionTimeout,
        inactivity_timeout: WEB_APP_CONFIG.features.inactivityTimeout
      }
    }, 'Player data retrieved successfully');

  } catch (error: any) {
    logger.error('Get player error:', error);
    
    if (error.message === 'Invalid token') {
      return ResponseHelper.fail(res, 'Invalid or expired token', 401);
    }
    
    return ResponseHelper.fail(res, error.message || 'Failed to get player data', 500);
  }
});

// Update player profile (protected)
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHelper.fail(res, 'Access token required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = playerService.verifyToken(token);
    
    const { username, phone_number } = req.body;
    
    // Validate input
    if (!username && !phone_number) {
      return ResponseHelper.fail(res, 'At least one field is required for update', 400);
    }

    if (username && (username.length < 3 || username.length > 30)) {
      return ResponseHelper.fail(res, 'Username must be between 3 and 30 characters', 400);
    }

    if (phone_number) {
      const phoneRegex = /^(?:\+251|0)?[9]\d{8}$/;
      if (!phoneRegex.test(phone_number)) {
        return ResponseHelper.fail(res, 'Invalid Ethiopian phone number format', 400);
      }
    }

    const updatedPlayer = await playerService.updatePlayer(decoded.id, {
      username,
      phone_number
    });

    logger.info('Player profile updated', { playerId: decoded.id });

    return ResponseHelper.success(res, {
      player: playerService.sanitizePlayer(updatedPlayer)
    }, 'Profile updated successfully');

  } catch (error: any) {
    logger.error('Update profile error:', error);
    
    if (error.message === 'Invalid token') {
      return ResponseHelper.fail(res, 'Invalid or expired token', 401);
    }
    
    if (error.message.includes('username')) {
      return ResponseHelper.fail(res, 'Username already taken', 400);
    }
    
    if (error.message.includes('phone_number')) {
      return ResponseHelper.fail(res, 'Phone number already registered', 400);
    }
    
    return ResponseHelper.fail(res, error.message || 'Failed to update profile', 500);
  }
});

// Change password (protected)
router.put('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHelper.fail(res, 'Access token required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = playerService.verifyToken(token);
    
    const { current_password, new_password, confirm_password } = req.body;
    
    // Validate input
    if (!current_password || !new_password || !confirm_password) {
      return ResponseHelper.fail(res, 'All password fields are required', 400);
    }

    if (new_password !== confirm_password) {
      return ResponseHelper.fail(res, 'New passwords do not match', 400);
    }

    if (new_password.length < 6) {
      return ResponseHelper.fail(res, 'New password must be at least 6 characters long', 400);
    }

    await playerService.changePassword(decoded.id, current_password, new_password);

    logger.info('Player password changed', { playerId: decoded.id });

    return ResponseHelper.success(res, null, 'Password changed successfully');

  } catch (error: any) {
    logger.error('Change password error:', error);
    
    if (error.message === 'Invalid token') {
      return ResponseHelper.fail(res, 'Invalid or expired token', 401);
    }
    
    if (error.message.includes('current password')) {
      return ResponseHelper.fail(res, 'Current password is incorrect', 400);
    }
    
    return ResponseHelper.fail(res, error.message || 'Failed to change password', 500);
  }
});

// Logout player (protected)
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHelper.fail(res, 'Access token required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = playerService.verifyToken(token);
    
    // Deactivate all sessions for this player
    await playerService.deactivateAllSessionsForPlayer(decoded.id);
    
    logger.info('Player logged out', { playerId: decoded.id });

    return ResponseHelper.success(res, null, 'Logout successful');

  } catch (error: any) {
    logger.error('Logout error:', error);
    
    if (error.message === 'Invalid token') {
      return ResponseHelper.fail(res, 'Invalid or expired token', 401);
    }
    
    return ResponseHelper.fail(res, error.message || 'Failed to logout', 500);
  }
});

// Get player sessions (protected)
router.get('/sessions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHelper.fail(res, 'Access token required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = playerService.verifyToken(token);
    
    const sessions = await playerService.getActiveSessionsByPlayerId(decoded.id);
    
    return ResponseHelper.success(res, {
      sessions,
      total_sessions: sessions.length,
      single_device_login: WEB_APP_CONFIG.features.singleDeviceLogin
    }, 'Sessions retrieved successfully');

  } catch (error: any) {
    logger.error('Get sessions error:', error);
    
    if (error.message === 'Invalid token') {
      return ResponseHelper.fail(res, 'Invalid or expired token', 401);
    }
    
    return ResponseHelper.fail(res, error.message || 'Failed to get sessions', 500);
  }
});

// Logout from all devices (protected)
router.post('/logout-all', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseHelper.fail(res, 'Access token required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = playerService.verifyToken(token);
    
    // Deactivate all sessions for this player
    await playerService.deactivateAllSessionsForPlayer(decoded.id);
    
    logger.info('Player logged out from all devices', { playerId: decoded.id });

    return ResponseHelper.success(res, null, 'Logged out from all devices successfully');

  } catch (error: any) {
    logger.error('Logout all error:', error);
    
    if (error.message === 'Invalid token') {
      return ResponseHelper.fail(res, 'Invalid or expired token', 401);
    }
    
    return ResponseHelper.fail(res, error.message || 'Failed to logout from all devices', 500);
  }
});

export { router as webPlayerAuthRoutes };
