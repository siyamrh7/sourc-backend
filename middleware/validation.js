const { body, param, query, validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new ErrorResponse(errorMessages.join(', '), 400));
  }
  
  next();
};

// Order validation rules
const validateCreateOrder = [
  body('customer.name')
    .notEmpty()
    .withMessage('Customer name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
    
  body('customer.email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('customer.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
    
  body('product.name')
    .notEmpty()
    .withMessage('Product name is required')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),

  body('product.description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Product description cannot exceed 1000 characters'),
    
  body('product.quantity')
    .notEmpty()
    .withMessage('Product quantity is required'),
    
  body('product.value')
    .notEmpty()
    .withMessage('Order value is required'),
    
  body('shipping.destination')
    .notEmpty()
    .withMessage('Shipping destination is required')
    .trim(),
    
  body('shipping.method')
    .optional()
    .isIn(['Sea Freight', 'Air Freight', 'Road Transport', 'Express Delivery'])
    .withMessage('Invalid shipping method'),

  body('shipping.carrier')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Carrier name cannot exceed 100 characters'),

  body('shipping.estimatedArrival')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid estimated arrival date'),
    
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be Low, Medium, or High'),

  body('status')
    .optional()
    .isIn(['Development', 'In Progress', 'Production', 'Shipped', 'Delivered', 'Cancelled'])
    .withMessage('Invalid order status'),

  body('progress.current')
    .optional()
    .isInt({ min: 0, max: 7 })
    .withMessage('Progress current must be between 0 and 7'),

  body('progress.total')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Progress total must be between 1 and 10'),

  body('timeline')
    .optional()
    .isArray()
    .withMessage('Timeline must be an array'),

  body('timeline.*.title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Timeline step title must be between 1 and 200 characters'),

  body('timeline.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Timeline step description cannot exceed 500 characters'),

  body('timeline.*.estimatedDuration')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Estimated duration cannot exceed 50 characters'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
    
  handleValidationErrors
];

const validateUpdateOrder = [
  body('customer.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
    
  body('customer.email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('customer.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
    
  body('product.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),

  body('product.description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Product description cannot exceed 1000 characters'),

  body('product.quantity')
    .optional()
    .trim(),

  body('product.value')
    .optional()
    .trim(),
    
  body('shipping.destination')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Destination must be between 1 and 200 characters'),
    
  body('shipping.method')
    .optional()
    .isIn(['Sea Freight', 'Air Freight', 'Road Transport', 'Express Delivery'])
    .withMessage('Invalid shipping method'),

  body('shipping.carrier')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Carrier name cannot exceed 100 characters'),

  body('shipping.estimatedArrival')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid estimated arrival date'),
    
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be Low, Medium, or High'),
    
  body('status')
    .optional()
    .isIn(['Development', 'In Progress', 'Production', 'Shipped', 'Delivered', 'Cancelled'])
    .withMessage('Invalid order status'),
    
  body('progress.current')
    .optional()
    .isInt({ min: 0, max: 7 })
    .withMessage('Progress current must be between 0 and 7'),

  body('progress.total')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Progress total must be between 1 and 10'),

  body('timeline')
    .optional()
    .isArray()
    .withMessage('Timeline must be an array'),

  body('timeline.*.title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Timeline step title must be between 1 and 200 characters'),

  body('timeline.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Timeline step description cannot exceed 500 characters'),

  body('timeline.*.estimatedDuration')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Estimated duration cannot exceed 50 characters'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
    
  handleValidationErrors
];

// Customer validation rules
const validateCreateCustomer = [
  body('name')
    .notEmpty()
    .withMessage('Customer name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
    
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
    
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
    
  body('company.name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name cannot exceed 200 characters'),
    
  body('customerType')
    .optional()
    .isIn(['business', 'individual'])
    .withMessage('Invalid customer type'),
    
  body('paymentTerms')
    .optional()
    .isIn(['Immediate', 'Net 15', 'Net 30', 'Net 60', 'Custom'])
    .withMessage('Invalid payment terms'),
    
  handleValidationErrors
];

// Admin validation rules
const validateCreateAdmin = [
  body('name')
    .notEmpty()
    .withMessage('Admin name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
    
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('role')
    .optional()
    .isIn(['admin', 'super_admin', 'manager'])
    .withMessage('Invalid admin role'),
    
  body('profile.department')
    .optional()
    .isIn(['Operations', 'Sales', 'Customer Service', 'Management', 'IT'])
    .withMessage('Invalid department'),
    
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  handleValidationErrors
];

// Parameter validation
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
    
  handleValidationErrors
];

// Updated to accept both MongoDB ObjectId and custom orderId formats
const validateOrderId = [
  param('orderId')
    .custom((value) => {
      // Check if it's a valid MongoDB ObjectId (24 hex characters)
      if (/^[0-9a-fA-F]{24}$/.test(value)) {
        return true;
      }
      // Check if it's a valid custom orderId format (ORD-YYYY-XXX)
      if (/^ORD-\d{4}-\d{3}$/.test(value)) {
        return true;
      }
      throw new Error('Invalid order ID format');
    })
    .withMessage('Order ID must be either a valid MongoDB ObjectId or in format ORD-YYYY-XXX'),
    
  handleValidationErrors
];

// Query validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('sort')
    .optional()
    .trim(),
    
  handleValidationErrors
];

const validateOrderQuery = [
  query('status')
    .optional()
    .isIn(['Development', 'In Progress', 'Production', 'Shipped', 'Delivered', 'Cancelled'])
    .withMessage('Invalid status filter'),
    
  query('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Invalid priority filter'),
    
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
    
  ...validatePagination
];

// Customer profile update validation
const validateCustomerProfileUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('address.street')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  
  body('address.city')
    .optional()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  
  body('address.state')
    .optional()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),
  
  body('address.postalCode')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters'),
  
  body('address.country')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters'),
  
  body('company.name')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Company name cannot exceed 200 characters'),
  
  body('company.website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  
  handleValidationErrors
];

// Customer login validation
const validateCustomerLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Update customer validation (for admin)
const validateUpdateCustomer = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('customerType')
    .optional()
    .isIn(['individual', 'business'])
    .withMessage('Customer type must be either individual or business'),
  
  body('accountStatus')
    .optional()
    .isIn(['active', 'suspended', 'pending'])
    .withMessage('Account status must be active, suspended, or pending'),
  
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

// Rename existing admin login validation
const validateLoginAdmin = validateLogin;

// Forgot password validation
const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  handleValidationErrors
];

// Reset password validation
const validateResetPassword = [
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  param('resettoken')
    .isLength({ min: 40, max: 40 })
    .withMessage('Invalid reset token format'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateCreateOrder,
  validateUpdateOrder,
  validateCreateCustomer,
  validateUpdateCustomer,
  validateCreateAdmin,
  validateLogin,
  validateLoginAdmin,
  validateCustomerLogin,
  validateCustomerProfileUpdate,
  validatePasswordChange,
  validateObjectId,
  validateOrderId,
  validatePagination,
  validateOrderQuery,
  validateForgotPassword,
  validateResetPassword
}; 