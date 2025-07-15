import { NextFunction, Request, Response } from 'express';
import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { CustomError } from '../../shared/errors/custom-error';
// ===========================
// CHAT VALIDATION
// ===========================

export const validateChatMessage: ValidationChain[] = [
  body('customerId')
    .isString()
    .notEmpty()
    .withMessage('Customer ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer ID must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Customer ID can only contain alphanumeric characters, hyphens, and underscores'),

  body('message')
    .isString()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
    .trim()
    .escape(), // Prevent XSS

  body('sessionId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Session ID cannot be empty if provided')
    .isLength({ max: 100 })
    .withMessage('Session ID cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Session ID can only contain alphanumeric characters, hyphens, and underscores'),
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    const errorDetails = errors.array().map(error => ({
      field: (error as any).param,
      message: error.msg,
      value: (error as any).value,
    }));

    res.status(400).json({
      success: false,
      message: `Validation failed: ${errorMessages.join(', ')}`,
      code: 'VALIDATION_ERROR',
      errors: errorDetails,
    });
    return;
  }

  next();
};

// ===========================
// ADDITIONAL VALIDATION HELPERS
// ===========================

export const validateObjectId = (fieldName: string = 'id'): ValidationChain => {
  return param(fieldName)
    .isString()
    .notEmpty()
    .withMessage(`${fieldName} is required`)
    .isLength({ min: 24, max: 24 })
    .withMessage(`Invalid ${fieldName} format`)
    .matches(/^[a-fA-F0-9]{24}$/)
    .withMessage(`Invalid MongoDB ObjectId format for ${fieldName}`);
};

export const validateSessionId: ValidationChain[] = [
  param('sessionId')
    .isString()
    .notEmpty()
    .withMessage('Session ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Session ID must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Invalid session ID format'),
];

export const validateCustomerId: ValidationChain[] = [
  param('customerId')
    .isString()
    .notEmpty()
    .withMessage('Customer ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer ID must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Invalid customer ID format'),
];

export const validateRegister = (req: Request, _res: Response, next: NextFunction): void => {
  const { email, password, firstName, lastName, role } = req.body;

  const errors: string[] = [];

  // Required fields
  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');
  if (!firstName) errors.push('First name is required');
  if (!lastName) errors.push('Last name is required');

  // Email validation
  if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }

  // Password validation
  if (password && password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  // Name validation
  if (firstName && firstName.length > 50) {
    errors.push('First name cannot be more than 50 characters');
  }
  if (lastName && lastName.length > 50) {
    errors.push('Last name cannot be more than 50 characters');
  }

  // Role validation
  if (role && !['admin', 'user', 'moderator'].includes(role)) {
    errors.push('Invalid role specified');
  }

  if (errors.length > 0) {
    return next(new CustomError(errors.join(', '), 400, 'VALIDATION_ERROR'));
  }

  next();
};

export const validateLogin = (req: Request, _res: Response, next: NextFunction): void => {
  const { email, password } = req.body;

  const errors: string[] = [];

  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');

  if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }

  if (errors.length > 0) {
    return next(new CustomError(errors.join(', '), 400, 'VALIDATION_ERROR'));
  }

  next();
};

export const validatePasswordChange = (req: Request, _res: Response, next: NextFunction): void => {
  const { currentPassword, newPassword } = req.body;

  const errors: string[] = [];

  if (!currentPassword) errors.push('Current password is required');
  if (!newPassword) errors.push('New password is required');

  if (newPassword && newPassword.length < 6) {
    errors.push('New password must be at least 6 characters long');
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push('New password must be different from current password');
  }

  if (errors.length > 0) {
    return next(new CustomError(errors.join(', '), 400, 'VALIDATION_ERROR'));
  }

  next();
};

export const validatePasswordReset = (req: Request, _res: Response, next: NextFunction): void => {
  const { token, newPassword } = req.body;

  const errors: string[] = [];

  if (!token) errors.push('Reset token is required');
  if (!newPassword) errors.push('New password is required');

  if (newPassword && newPassword.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (errors.length > 0) {
    return next(new CustomError(errors.join(', '), 400, 'VALIDATION_ERROR'));
  }

  next();
};

// ===========================
// CUSTOMER VALIDATION
// ===========================

export const validateCreateCustomer: ValidationChain[] = [
  body('name')
    .isString()
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer name must be between 1 and 100 characters')
    .trim()
    .escape()
    .matches(/^[a-zA-Z\s\-'\\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters')
    .custom(async email => {
      // Additional email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),

  body('phone')
    .optional()
    .isString()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format (use international format with optional +)')
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
];

export const validateUpdateCustomer: ValidationChain[] = [
  body('name')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Customer name cannot be empty')
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer name must be between 1 and 100 characters')
    .trim()
    .escape()
    .matches(/^[a-zA-Z\s\-'\\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters'),

  body('phone')
    .optional()
    .custom(value => {
      if (value === null || value === '') return true; // Allow null/empty
      if (typeof value !== 'string') return false;
      return /^\+?[1-9]\d{1,14}$/.test(value);
    })
    .withMessage('Invalid phone number format')
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
];

// ===========================
// PRODUCT VALIDATION
// ===========================

export const validateCreateProduct: ValidationChain[] = [
  body('name')
    .isString()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name must be between 1 and 200 characters')
    .trim()
    .escape(),

  body('description')
    .isString()
    .notEmpty()
    .withMessage('Product description is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Product description must be between 10 and 1000 characters')
    .trim()
    .escape(),

  body('category')
    .isString()
    .notEmpty()
    .withMessage('Product category is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Product category must be between 1 and 100 characters')
    .trim()
    .escape()
    .isIn([
      'Electronics',
      'Appliances',
      'Sports',
      'Books',
      'Clothing',
      'Home',
      'Garden',
      'Toys',
      'Health',
      'Beauty',
    ])
    .withMessage('Invalid product category'),

  body('price')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Price must be between 0.01 and 1,000,000')
    .toFloat(),

  body('inStock').isBoolean().withMessage('inStock must be a boolean').toBoolean(),

  body('features')
    .optional()
    .isArray({ min: 0, max: 50 })
    .withMessage('Features must be an array with maximum 50 items')
    .custom(features => {
      return features.every(
        (feature: any) =>
          typeof feature === 'string' && feature.length >= 1 && feature.length <= 100
      );
    })
    .withMessage('All features must be strings between 1-100 characters'),

  body('tags')
    .optional()
    .isArray({ min: 0, max: 20 })
    .withMessage('Tags must be an array with maximum 20 items')
    .custom(tags => {
      return tags.every(
        (tag: any) =>
          typeof tag === 'string' &&
          tag.length >= 1 &&
          tag.length <= 50 &&
          /^[a-zA-Z0-9\-_\s]+$/.test(tag)
      );
    })
    .withMessage('All tags must be alphanumeric strings between 1-50 characters'),

  body('specifications')
    .optional()
    .isObject()
    .withMessage('Specifications must be an object')
    .custom(specs => {
      const keys = Object.keys(specs);
      if (keys.length > 20) {
        throw new Error('Specifications cannot have more than 20 properties');
      }
      return keys.every(
        key =>
          typeof key === 'string' &&
          key.length <= 50 &&
          typeof specs[key] === 'string' &&
          specs[key].length <= 200
      );
    })
    .withMessage('Specification keys and values must be strings within size limits'),
];

export const validateUpdateProduct: ValidationChain[] = [
  body('name')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Product name cannot be empty')
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name must be between 1 and 200 characters')
    .trim()
    .escape(),

  body('description')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Product description cannot be empty')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Product description must be between 10 and 1000 characters')
    .trim()
    .escape(),

  body('category')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Product category cannot be empty')
    .isLength({ min: 1, max: 100 })
    .withMessage('Product category must be between 1 and 100 characters')
    .trim()
    .escape()
    .isIn([
      'Electronics',
      'Appliances',
      'Sports',
      'Books',
      'Clothing',
      'Home',
      'Garden',
      'Toys',
      'Health',
      'Beauty',
    ])
    .withMessage('Invalid product category'),

  body('price')
    .optional()
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Price must be between 0.01 and 1,000,000')
    .toFloat(),

  body('inStock').optional().isBoolean().withMessage('inStock must be a boolean').toBoolean(),

  body('features')
    .optional()
    .isArray({ min: 0, max: 50 })
    .withMessage('Features must be an array with maximum 50 items')
    .custom(features => {
      return features.every(
        (feature: any) =>
          typeof feature === 'string' && feature.length >= 1 && feature.length <= 100
      );
    })
    .withMessage('All features must be strings between 1-100 characters'),

  body('tags')
    .optional()
    .isArray({ min: 0, max: 20 })
    .withMessage('Tags must be an array with maximum 20 items')
    .custom(tags => {
      return tags.every(
        (tag: any) =>
          typeof tag === 'string' &&
          tag.length >= 1 &&
          tag.length <= 50 &&
          /^[a-zA-Z0-9\-_\s]+$/.test(tag)
      );
    })
    .withMessage('All tags must be alphanumeric strings between 1-50 characters'),
];

export const validateProductId: ValidationChain[] = [
  param('productId')
    .isString()
    .notEmpty()
    .withMessage('Product ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Product ID must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Invalid product ID format'),
];

// ===========================
// SEARCH VALIDATION
// ===========================

export const validateProductSearch: ValidationChain[] = [
  query('q')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1-200 characters')
    .trim()
    .escape(),

  query('category')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters')
    .trim()
    .escape()
    .isIn([
      'Electronics',
      'Appliances',
      'Sports',
      'Books',
      'Clothing',
      'Home',
      'Garden',
      'Toys',
      'Health',
      'Beauty',
    ])
    .withMessage('Invalid category'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be 0 or greater')
    .toFloat(),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be 0 or greater')
    .toFloat()
    .custom((value, { req }) => {
      const minPrice = parseFloat(req.query?.minPrice as string);
      if (minPrice && value < minPrice) {
        throw new Error('Max price must be greater than min price');
      }
      return true;
    }),

  query('inStock').optional().isBoolean().withMessage('inStock must be true or false').toBoolean(),

  query('tags')
    .optional()
    .customSanitizer(value => {
      if (typeof value === 'string') {
        return value
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }
      return Array.isArray(value) ? value : [];
    })
    .isArray({ max: 10 })
    .withMessage('Tags must be a comma-separated string or array with max 10 items'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be 0 or greater').toInt(),
];

// ===========================
// ADMIN VALIDATION
// ===========================

export const validateEmbeddingOptions: ValidationChain[] = [
  body('batchSize')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Batch size must be between 1 and 50')
    .toInt(),

  body('delayBetweenBatches')
    .optional()
    .isInt({ min: 0, max: 30000 })
    .withMessage('Delay must be between 0 and 30000 milliseconds')
    .toInt(),

  body('maxRetries')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Max retries must be between 1 and 10')
    .toInt(),

  body('skipExisting')
    .optional()
    .isBoolean()
    .withMessage('Skip existing must be a boolean')
    .toBoolean(),

  body('forceRegenerate')
    .optional()
    .isBoolean()
    .withMessage('Force regenerate must be a boolean')
    .toBoolean(),
];

export const validateProductIds: ValidationChain[] = [
  body('productIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Product IDs must be a non-empty array with maximum 100 items')
    .custom(productIds => {
      return productIds.every(
        (id: any) =>
          typeof id === 'string' &&
          id.length > 0 &&
          id.length <= 100 &&
          /^[a-zA-Z0-9\-_]+$/.test(id)
      );
    })
    .withMessage('All product IDs must be valid strings'),

  body('options').optional().isObject().withMessage('Options must be an object'),
];

// ===========================
// PAGINATION VALIDATION
// ===========================

export const validatePagination: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be 1 or greater').toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sort')
    .optional()
    .isString()
    .isIn(['name', 'price', 'created', 'updated', '-name', '-price', '-created', '-updated'])
    .withMessage('Invalid sort field'),
];

// ===========================
// FILE UPLOAD VALIDATION
// ===========================

export const validateFileUpload: ValidationChain[] = [
  body('file').custom((_value, { req }) => {
    if (!req.file) {
      throw new Error('File is required');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      throw new Error('File size cannot exceed 5MB');
    }

    return true;
  }),
];

export const validateUpdateUserProfile: ValidationChain[] = [
  body('firstName')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .trim()
    .escape()
    .matches(/^[a-zA-Z\s\-'\\.]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('lastName')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .trim()
    .escape()
    .matches(/^[a-zA-Z\s\-'\\.]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and periods'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters'),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean').toBoolean(),

  body('emailVerified')
    .optional()
    .isBoolean()
    .withMessage('emailVerified must be a boolean')
    .toBoolean(),
];

export const validateUpdateUserRole: ValidationChain[] = [
  param('userId')
    .isString()
    .notEmpty()
    .withMessage('User ID is required')
    .isLength({ min: 24, max: 24 })
    .withMessage('Invalid user ID format')
    .matches(/^[a-fA-F0-9]{24}$/)
    .withMessage('Invalid MongoDB ObjectId format'),

  body('role')
    .isString()
    .isIn(['admin', 'user', 'moderator'])
    .withMessage('Role must be admin, user, or moderator'),

  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
    .custom(permissions => {
      const validPermissions = [
        '*',
        'chat:read',
        'chat:write',
        'products:read',
        'products:write',
        'analytics:read',
        'customers:read',
        'customers:write',
        'users:read',
        'users:write',
        'admin:read',
        'admin:write',
      ];

      return permissions.every(
        (permission: string) =>
          typeof permission === 'string' && validPermissions.includes(permission)
      );
    })
    .withMessage('Invalid permissions specified'),
];

export const validateUserId: ValidationChain[] = [
  param('userId')
    .isString()
    .notEmpty()
    .withMessage('User ID is required')
    .isLength({ min: 24, max: 24 })
    .withMessage('Invalid user ID format')
    .matches(/^[a-fA-F0-9]{24}$/)
    .withMessage('Invalid MongoDB ObjectId format'),
];

export const validateUserSearch: ValidationChain[] = [
  query('search')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1-100 characters')
    .trim()
    .escape(),

  query('role')
    .optional()
    .isString()
    .isIn(['admin', 'user', 'moderator'])
    .withMessage('Role must be admin, user, or moderator'),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be true or false')
    .toBoolean(),

  query('emailVerified')
    .optional()
    .isBoolean()
    .withMessage('emailVerified must be true or false')
    .toBoolean(),

  query('page').optional().isInt({ min: 1 }).withMessage('Page must be 1 or greater').toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

// ===========================
// BULK OPERATIONS VALIDATION
// ===========================

export const validateBulkUserAction: ValidationChain[] = [
  body('userIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('User IDs must be an array with 1-50 items')
    .custom(userIds => {
      return userIds.every(
        (id: string) => typeof id === 'string' && id.length === 24 && /^[a-fA-F0-9]{24}$/.test(id)
      );
    })
    .withMessage('All user IDs must be valid MongoDB ObjectIds'),

  body('action')
    .isString()
    .isIn(['activate', 'deactivate', 'delete', 'change-role'])
    .withMessage('Action must be activate, deactivate, delete, or change-role'),

  body('newRole')
    .if(body('action').equals('change-role'))
    .isString()
    .isIn(['admin', 'user', 'moderator'])
    .withMessage('New role must be admin, user, or moderator when action is change-role'),
];

export const validateEmail = (fieldName: string = 'email'): ValidationChain => {
  return body(fieldName)
    .isEmail()
    .withMessage(`Valid ${fieldName} is required`)
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage(`${fieldName} cannot exceed 255 characters`);
};

export const validatePassword = (
  fieldName: string = 'password',
  isOptional: boolean = false
): ValidationChain => {
  const validator = isOptional ? body(fieldName).optional() : body(fieldName);

  return validator
    .isString()
    .isLength({ min: 6, max: 128 })
    .withMessage(`${fieldName} must be between 6 and 128 characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      `${fieldName} must contain at least one lowercase letter, one uppercase letter, and one number`
    );
};

export const validateRole = (
  fieldName: string = 'role',
  isOptional: boolean = false
): ValidationChain => {
  const validator = isOptional ? body(fieldName).optional() : body(fieldName);

  return validator
    .isString()
    .isIn(['admin', 'user', 'moderator'])
    .withMessage(`${fieldName} must be admin, user, or moderator`);
};
