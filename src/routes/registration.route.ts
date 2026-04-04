import { Router } from 'express';
import { RegistrationController } from '../controllers/registration.controller';

const router = Router();

/**
 * @route POST /api/registration/request-otp
 * @desc Request registration OTP
 * @access Public
 */
router.post('/request-otp', RegistrationController.requestRegistrationOtp);

/**
 * @route POST /api/registration/verify-otp
 * @desc Verify registration OTP and complete registration
 * @access Public
 */
router.post('/verify-otp', RegistrationController.verifyRegistrationOtp);

/**
 * @route POST /api/registration/resend-otp
 * @desc Resend registration OTP
 * @access Public
 */
router.post('/resend-otp', RegistrationController.resendRegistrationOtp);

/**
 * @route POST /api/registration/check-pending
 * @desc Check for pending registration codes
 * @access Public
 */
router.post('/check-pending', RegistrationController.checkPendingCodes);

export default router;
