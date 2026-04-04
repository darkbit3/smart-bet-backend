import { Router } from 'express';
import { TelegramPhoneNumberController } from '../controllers/telegram_phonenumber.controller';

const router = Router();

/**
 * POST /api/telegram-phonenumber
 * Save telegram user information when phone number is shared
 * @access Public (for telegram bot integration)
 */
router.post('/', TelegramPhoneNumberController.saveTelegramUser);

/**
 * GET /api/telegram-phonenumber/verify/:phoneNumber
 * Check if phone number exists in telegram_users table
 * @access Public (for telegram bot integration)
 */
router.get('/verify/:phoneNumber', TelegramPhoneNumberController.verifyPhoneNumber);

/**
 * GET /api/telegram-phonenumber/user/:telegramUserId
 * Get telegram user by telegram user ID
 * @access Public (for telegram bot integration)
 */
router.get('/user/:telegramUserId', TelegramPhoneNumberController.getTelegramUser);

/**
 * POST /api/telegram-phonenumber/send-code
 * Send verification code to telegram user
 * @access Public (for telegram bot integration)
 */
router.post('/send-code', TelegramPhoneNumberController.sendVerificationCode);

/**
 * POST /api/telegram-phonenumber/verify-code
 * Verify reset code and update password
 * @access Public (for telegram bot integration)
 */
router.post('/verify-code', TelegramPhoneNumberController.verifyResetCode);

export default router;
