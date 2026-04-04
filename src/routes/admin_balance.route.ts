import { Router } from 'express';
import { AdminBalanceController } from '../controllers/admin_balance.controller';
import * as Joi from 'joi';
import { authenticateAdmin } from '../middleware/adminAuth.middleware';

const router = Router();

/**
 * Validation middleware using Joi
 */
const validateUpdateBalance = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    new_balance: Joi.number().min(0).required().messages({
      'number.base': 'Balance must be a number',
      'number.min': 'Balance cannot be negative',
      'any.required': 'New balance is required'
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
    limit: Joi.number().integer().min(1).max(100).optional().messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
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
 * @route   GET /api/admin-balance/current
 * @desc    Get current admin balance
 * @access  Private (Admin only)
 */
router.get('/current',
  authenticateAdmin,
  AdminBalanceController.getCurrentBalance
);

/**
 * @route   POST /api/admin-balance/update
 * @desc    Update admin balance
 * @access  Private (Admin only)
 */
router.post('/update',
  authenticateAdmin,
  validateUpdateBalance,
  AdminBalanceController.updateBalance
);

/**
 * @route   GET /api/admin-balance/history
 * @desc    Get balance change history
 * @access  Private (Admin only)
 */
router.get('/history',
  authenticateAdmin,
  validateQueryParams,
  AdminBalanceController.getBalanceHistory
);

/**
 * @route   POST /api/admin-balance/refresh
 * @desc    Refresh admin balance (trigger update)
 * @access  Private (Admin only)
 */
router.post('/refresh',
  authenticateAdmin,
  AdminBalanceController.refreshBalance
);

export default router;
