import Joi from 'joi';

export const createPlayerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required()
    .messages({
      'string.alphanum': 'Username can only contain letters and numbers',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required'
    }),
  
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
    .messages({
      'string.pattern.base': 'Please enter a valid phone number',
      'any.required': 'Phone number is required'
    }),
  
  password: Joi.string().min(8).required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required'
    }),
  
  createdBy: Joi.string().optional(),
  
  totalBalance: Joi.number().min(0).default(0),
  realBalance: Joi.number().min(0).default(0),
  bonusBalance: Joi.number().min(0).default(0),
  withdrawable: Joi.number().min(0).default(0),
  
  status: Joi.string().valid('active', 'inactive', 'suspended', 'banned').default('active')
});

export const updatePlayerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  createdBy: Joi.string().optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended', 'banned').optional()
}).min(1);

export const updateBalanceSchema = Joi.object({
  realBalance: Joi.number().min(0).optional(),
  bonusBalance: Joi.number().min(0).optional()
}).min(1)
  .messages({
    'object.min': 'At least one balance field must be provided'
  });

export const changeStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'suspended', 'banned').required()
    .messages({
      'any.only': 'Status must be one of: active, inactive, suspended, banned',
      'any.required': 'Status is required'
    })
});

export const getPlayerByIdSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    .messages({
      'string.pattern.base': 'Invalid player ID format',
      'any.required': 'Player ID is required'
    })
});

export const queryPlayerSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('active', 'inactive', 'suspended', 'banned').optional(),
  search: Joi.string().max(100).optional()
});
