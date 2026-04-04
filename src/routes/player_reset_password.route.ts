import { Router } from 'express';
import { PlayerResetPasswordController } from '../controllers/player_reset_password.controller';

const router = Router();

/**
 * POST /api/player-reset-password
 * Request password reset with phone number
 * @access Public
 */
router.post('/request', PlayerResetPasswordController.requestReset);

/**
 * POST /api/player-reset-password/verify
 * Verify reset code
 * @access Public
 */
router.post('/verify', PlayerResetPasswordController.verifyCode);

/**
 * POST /api/player-reset-password/reset
 * Reset password with verification code
 * @access Public
 */
router.post('/reset', PlayerResetPasswordController.resetPassword);

/**
 * POST /api/player-reset-password/check-pending
 * Check for pending reset codes
 * @access Public
 */
router.post('/check-pending', PlayerResetPasswordController.checkPendingCodes);

export default router;
