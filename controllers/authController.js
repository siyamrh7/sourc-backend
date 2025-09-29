const Admin = require('../models/Admin');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Login admin
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find admin by email and include password
  const admin = await Admin.findByEmail(email);
  if (!admin) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }
  // Check if account is locked
  if (admin.isLocked) {
    return next(new ErrorResponse('Account is temporarily locked due to too many failed login attempts', 423));
  }

  // Check if account is active
  if (!admin.isActive) {
    return next(new ErrorResponse('Account is deactivated', 401));
  }

  // Check password
  const isMatch = await admin.matchPassword(password);

  if (!isMatch) {
    await admin.incLoginAttempts();
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Reset login attempts on successful login
  await admin.resetLoginAttempts();

  sendTokenResponse(admin, 200, res);
});

// @desc    Get current logged in admin
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res, next) => {
  const admin = await Admin.findById(req.admin._id);

  res.status(200).json({
    success: true,
    data: admin
  });
});

// @desc    Logout admin
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Admin logged out successfully'
  });
});

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (admin, statusCode, res) => {
  // Create token
  const token = admin.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      }
    });
};

module.exports = {
  login,
  getMe,
  logout
}; 