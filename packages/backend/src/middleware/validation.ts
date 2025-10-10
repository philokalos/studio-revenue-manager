import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Input validation and sanitization middleware
 * Using express-validator for comprehensive validation
 */

/**
 * Validation result handler
 * Checks for validation errors and returns formatted response
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((err) => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg,
        value: err.type === 'field' ? err.value : undefined,
      })),
    });
    return;
  }

  next();
};

/**
 * Common validators
 */

// Email validation (standard format)
export const validateEmail = (): ValidationChain =>
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters');

// Korean phone number validation (010-XXXX-XXXX or 010XXXXXXXX)
export const validateKoreanPhone = (field: string = 'phone'): ValidationChain =>
  body(field)
    .trim()
    .matches(/^01[016789]-?\d{3,4}-?\d{4}$/)
    .withMessage('Invalid Korean phone number format (010-XXXX-XXXX)')
    .customSanitizer((value) => value.replace(/-/g, '')); // Remove hyphens

// Password validation (minimum security requirements)
export const validatePassword = (): ValidationChain =>
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    );

// Name validation (Korean/English)
export const validateName = (field: string = 'name'): ValidationChain =>
  body(field)
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(`${field} must be between 1 and 100 characters`)
    .matches(/^[a-zA-Z가-힣\s]+$/)
    .withMessage(`${field} must contain only letters (Korean or English) and spaces`);

// ID parameter validation (UUID or numeric)
export const validateId = (paramName: string = 'id'): ValidationChain =>
  param(paramName)
    .trim()
    .matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$|^\d+$/)
    .withMessage(`Invalid ${paramName} format`);

// Date validation (ISO 8601 format)
export const validateDate = (field: string = 'date'): ValidationChain =>
  body(field)
    .trim()
    .isISO8601()
    .withMessage(`${field} must be a valid ISO 8601 date`)
    .toDate();

// Date range validation
export const validateDateRange = (): ValidationChain[] => [
  query('startDate')
    .optional()
    .trim()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date')
    .toDate(),
  query('endDate')
    .optional()
    .trim()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date')
    .toDate()
    .custom((endDate, { req }) => {
      if (req.query && req.query.startDate && endDate < new Date(req.query.startDate as string)) {
        throw new Error('endDate must be after startDate');
      }
      return true;
    }),
];

// Pagination validation
export const validatePagination = (): ValidationChain[] => [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('page must be an integer between 1 and 10000')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100')
    .toInt(),
];

// Amount validation (for financial data)
export const validateAmount = (field: string = 'amount'): ValidationChain =>
  body(field)
    .isFloat({ min: 0, max: 999999999.99 })
    .withMessage(`${field} must be a valid amount (0 to 999,999,999.99)`)
    .toFloat();

// URL validation
export const validateUrl = (field: string = 'url'): ValidationChain =>
  body(field)
    .trim()
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true,
    })
    .withMessage(`${field} must be a valid URL`)
    .isLength({ max: 2048 })
    .withMessage(`${field} must not exceed 2048 characters`);

/**
 * Sanitization functions
 */

// SQL injection protection - escape special characters
export const sanitizeForSql = (value: string): string => {
  if (typeof value !== 'string') return value;
  return value
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comment start
    .replace(/\*\//g, ''); // Remove multi-line comment end
};

// XSS protection - sanitize HTML
export const sanitizeHtml = (value: string): string => {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Trim and remove extra whitespace
export const normalizeWhitespace = (value: string): string => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\s+/g, ' ');
};

/**
 * Custom validators for business logic
 */

// Validate Korean business registration number (사업자등록번호)
export const validateBusinessRegistrationNumber = (): ValidationChain =>
  body('businessRegistrationNumber')
    .trim()
    .matches(/^\d{3}-\d{2}-\d{5}$/)
    .withMessage('Invalid business registration number format (XXX-XX-XXXXX)');

// Validate time in HH:MM format
export const validateTime = (field: string = 'time'): ValidationChain =>
  body(field)
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage(`${field} must be in HH:MM format`);

// Validate enum values
export const validateEnum = (field: string, allowedValues: string[]): ValidationChain =>
  body(field)
    .trim()
    .isIn(allowedValues)
    .withMessage(`${field} must be one of: ${allowedValues.join(', ')}`);

/**
 * Composite validators for common use cases
 */

// User registration validation
export const validateUserRegistration = (): ValidationChain[] => [
  validateEmail(),
  validatePassword(),
  validateName('name'),
  validateKoreanPhone(),
];

// Login validation
export const validateLogin = (): ValidationChain[] => [
  validateEmail(),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required'),
];

// Studio creation validation
export const validateStudioCreation = (): ValidationChain[] => [
  validateName('name'),
  validateKoreanPhone('phone'),
  body('address')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),
];

export { validationResult };
