import { Router } from 'express';
import { AdminCashierWithdrawController } from '../controllers/admin_cashier_withdraw.controller';
import * as Joi from 'joi';
import { authenticateAdmin } from '../middleware/adminAuth.middleware';

const router = Router();

/**
 * Validation middleware using Joi
 */
const validateWithdrawRequest = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    cashier_username: Joi.string().required().messages({
      'string.empty': 'Cashier username is required',
      'any.required': 'Cashier username is required'
    }),
    amount: Joi.number().positive().required().messages({
      'number.positive': 'Amount must be a positive number',
      'any.required': 'Amount is required'
    }),
    description: Joi.string().optional().max(255).messages({
      'string.max': 'Description must not exceed 255 characters'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

const validateQueryParams = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional()
  });

  const { error } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

/**
 * @route   POST /api/admin-cashier-withdraw
 * @desc    Process withdrawal from cashier to admin
 * @access  Private (Admin only)
 */
router.post('/',
  authenticateAdmin,
  validateWithdrawRequest,
  AdminCashierWithdrawController.processWithdrawal
);

/**
 * @route   GET /api/admin-cashier-withdraw/history
 * @desc    Get withdrawal history for admin
 * @access  Private (Admin only)
 */
router.get('/history',
  authenticateAdmin,
  validateQueryParams,
  AdminCashierWithdrawController.getWithdrawalHistory
);

/**
 * @route   GET /api/admin-cashier-withdraw/summary
 * @desc    Get transaction summary for admin
 * @access  Private (Admin only)
 */
router.get('/summary',
  authenticateAdmin,
  AdminCashierWithdrawController.getTransactionSummary
);

export default router;
