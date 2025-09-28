const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// Protect customer routes - require customer authentication
const protectCustomer = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies && req.cookies.customer_token) {
    token = req.cookies.customer_token;
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Make sure this is a customer token
    if (decoded.type !== 'customer') {
      return next(new ErrorResponse('Invalid token type', 401));
    }

    // Find customer by id from token
    const customer = await Customer.findById(decoded.id);

    if (!customer) {
      return next(new ErrorResponse('No customer found with this token', 401));
    }

    // Check if customer is active
    if (!customer.isActive) {
      return next(new ErrorResponse('Customer account is deactivated', 401));
    }

    // Check if customer account is suspended
    if (customer.accountStatus === 'suspended') {
      return next(new ErrorResponse('Customer account is suspended', 401));
    }

    // Update last activity
    customer.lastLoginDate = new Date();
    await customer.save();

    req.customer = customer;
    next();
  } catch (error) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Optional customer authentication (doesn't fail if no token)
const optionalCustomerAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.customer_token) {
    token = req.cookies.customer_token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      
      if (decoded.type === 'customer') {
        const customer = await Customer.findById(decoded.id);
        
        if (customer && customer.isActive && customer.accountStatus !== 'suspended') {
          req.customer = customer;
          customer.lastLoginDate = new Date();
          await customer.save();
        }
      }
    } catch (error) {
      // Token is invalid, but we don't fail the request
      console.log('Invalid customer token in optional auth:', error.message);
    }
  }

  next();
});

module.exports = {
  protectCustomer,
  optionalCustomerAuth
}; 