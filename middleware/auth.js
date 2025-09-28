const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// Protect routes - require authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Find admin by id from token
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return next(new ErrorResponse('No admin found with this token', 401));
    }

    // Check if admin is active
    if (!admin.isActive) {
      return next(new ErrorResponse('Admin account is deactivated', 401));
    }

    // Check if admin account is locked
    if (admin.isLocked) {
      return next(new ErrorResponse('Admin account is temporarily locked', 401));
    }

    // Update last activity
    admin.updateActivity();

    req.admin = admin;
    next();
  } catch (error) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    if (!roles.includes(req.admin.role)) {
      return next(
        new ErrorResponse(
          `Admin role '${req.admin.role}' is not authorized to access this route`,
          403
        )
      );
    }

    next();
  };
};

// Check specific permissions
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    // Check if admin has the required permission
    if (!req.admin.permissions || !req.admin.permissions[permission]) {
      return next(
        new ErrorResponse(
          `Not authorized to perform this action. Missing permission: ${permission}`,
          403
        )
      );
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const admin = await Admin.findById(decoded.id);
      
      if (admin && admin.isActive && !admin.isLocked) {
        req.admin = admin;
        admin.updateActivity();
      }
    } catch (error) {
      // Token is invalid, but we don't fail the request
      console.log('Invalid token in optional auth:', error.message);
    }
  }

  next();
});

// Middleware to log admin actions
const logAdminAction = (action) => {
  return (req, res, next) => {
    if (req.admin) {
      console.log(`Admin Action: ${req.admin.email} performed ${action} on ${new Date().toISOString()}`);
      
      // You could store this in a separate AdminLog model if needed
      // const logEntry = {
      //   adminId: req.admin._id,
      //   action,
      //   timestamp: new Date(),
      //   ipAddress: req.ip,
      //   userAgent: req.get('User-Agent')
      // };
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
  checkPermission,
  optionalAuth,
  logAdminAction
}; 