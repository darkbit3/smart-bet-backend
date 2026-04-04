import { Router } from 'express';
import { AdminPlayerWithdrawController } from '../controllers/admin_player_withdraw.controller';
import * as Joi from 'joi';
import { authenticateAdmin } from '../middleware/adminAuth.middleware';

const router = Router();

/**
 * Validation middleware using Joi
 */
const validateWithdrawRequest = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    player_id: Joi.number().integer().positive().required().messages({
      'number.base': 'Player ID must be a number',
      'number.integer': 'Player ID must be an integer',
      'number.positive': 'Player ID must be positive',
      'any.required': 'Player ID is required'
    }),
    amount: Joi.number().positive().required().messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be a positive number',
      'any.required': 'Amount is required'
    }),
    description: Joi.string().optional().messages({
      'string.base': 'Description must be a string'
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
    page: Joi.number().integer().min(1).optional().messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
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
 * @route   POST /api/admin-player-withdraw
 * @desc    Process withdrawal from player to admin
 * @access  Private (Admin only)
 */
router.post('/',
  authenticateAdmin,
  validateWithdrawRequest,
  AdminPlayerWithdrawController.processWithdraw
);

/**
 * @route   GET /api/admin-player-withdraw/history
 * @desc    Get admin to player withdrawal history
 * @access  Private (Admin only)
 */
router.get('/history',
  authenticateAdmin,
  validateQueryParams,
  AdminPlayerWithdrawController.getWithdrawHistory
);

/**
 * @route   GET /api/admin-player-withdraw/summary
 * @desc    Get withdrawal summary statistics
 * @access  Private (Admin only)
 */
router.get('/summary',
  authenticateAdmin,
  AdminPlayerWithdrawController.getWithdrawSummary
);

export default router;
