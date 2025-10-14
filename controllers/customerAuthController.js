const Customer = require('../models/Customer');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// Helper function to send token response
const sendTokenResponse = (customer, statusCode, res) => {
  // Create token
  const token = customer.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('customer_token', token, options)
    .json({
      success: true,
      token,
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        company: customer.company,
        phone: customer.phone,
        fullAddress: customer.fullAddress,
        customerType: customer.customerType,
        accountStatus: customer.accountStatus
      }
    });
};

// @desc    Login customer
// @route   POST /api/customer-auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email and password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Find customer by email and include password
  const customer = await Customer.findByEmail(email).select('+password');

  if (!customer) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if customer account is active
  if (!customer.isActive) {
    return next(new ErrorResponse('Account is deactivated. Please contact support.', 401));
  }

  // Check if account status allows login
  if (customer.accountStatus === 'suspended') {
    return next(new ErrorResponse('Account is suspended. Please contact support.', 401));
  }

  // Check password
  const isMatch = await customer.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Update last login
  customer.lastLoginDate = new Date();
  await customer.save();

  sendTokenResponse(customer, 200, res);
});

// @desc    Get current logged in customer
// @route   GET /api/customer-auth/me
// @access  Private (Customer)
const getMe = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.customer._id).select('-password');

  res.status(200).json({
    success: true,
    data: customer
  });
});

// @desc    Update customer profile
// @route   PUT /api/customer-auth/update-profile
// @access  Private (Customer)
const updateProfile = asyncHandler(async (req, res, next) => {
  // Fields that can be updated by customer
  const fieldsToUpdate = {
    name: req.body.name,
    phone: req.body.phone,
    fullAddress: req.body.fullAddress,
    'address.street': req.body.address?.street,
    'address.city': req.body.address?.city,
    'address.state': req.body.address?.state,
    'address.postalCode': req.body.address?.postalCode,
    'address.country': req.body.address?.country,
    'company.name': req.body.company?.name,
    'company.taxId': req.body.company?.taxId,
    'company.website': req.body.company?.website,
    'company.kvk': req.body.company?.kvk
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => 
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const customer = await Customer.findByIdAndUpdate(
    req.customer._id,
    fieldsToUpdate,
    { new: true, runValidators: true }
  ).select('-password');

  res.status(200).json({
    success: true,
    data: customer
  });
});

// @desc    Change customer password
// @route   PUT /api/customer-auth/change-password
// @access  Private (Customer)
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ErrorResponse('Please provide current and new password', 400));
  }

  // Get customer with password
  const customer = await Customer.findById(req.customer._id).select('+password');

  // Check current password
  const isMatch = await customer.matchPassword(currentPassword);

  if (!isMatch) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }

  // Update password
  customer.password = newPassword;
  await customer.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
});

// @desc    Get customer orders
// @route   GET /api/customer-auth/orders
// @access  Private (Customer)
const getMyOrders = asyncHandler(async (req, res, next) => {
  const Order = require('../models/Order');
  
  const { page = 1, limit = 10, status } = req.query;
  
  // Build query
  let query = { 
    'customer.email': req.customer.email,
    isActive: true 
  };
  
  if (status && status !== 'all') {
    query.status = status;
  }
  
  // Execute query with pagination
  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  // Get total count for pagination
  const total = await Order.countDocuments(query);
  
  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      current: page,
      total: Math.ceil(total / limit),
      count: orders.length,
      totalRecords: total
    }
  });
});

// @desc    Get single order
// @route   GET /api/customer-auth/orders/:id
// @access  Private (Customer)
const getMyOrder = asyncHandler(async (req, res, next) => {
  const Order = require('../models/Order');
  
  const order = await Order.findOne({
    _id: req.params.id,
    'customer.email': req.customer.email,
    isActive: true
  });
  
  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }
  
  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Logout customer
// @route   POST /api/customer-auth/logout
// @access  Private (Customer)
const logout = asyncHandler(async (req, res, next) => {
  res.cookie('customer_token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Customer logged out successfully'
  });
});

// @desc    Forgot password
// @route   POST /api/customer-auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorResponse('Please provide an email address', 400));
  }

  const customer = await Customer.findByEmail(email);

  if (!customer) {
    return next(new ErrorResponse('No customer found with this email address', 404));
  }

  // Get reset token
  const resetToken = customer.getResetPasswordToken();

  await customer.save({ validateBeforeSave: false });

  try {
    // Send email
    const emailService = require('../utils/emailService');
    const result = await emailService.sendPasswordResetEmail(customer.email, resetToken);

    if (!result.success) {
      customer.resetPasswordToken = undefined;
      customer.resetPasswordExpire = undefined;
      
      await customer.save({ validateBeforeSave: false });
      
      return next(new ErrorResponse('Email could not be sent', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (err) {
    console.error(err);
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExpire = undefined;
    
    await customer.save({ validateBeforeSave: false });
    
    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/customer-auth/reset-password/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  const crypto = require('crypto');
  
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const customer = await Customer.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!customer) {
    return next(new ErrorResponse('Invalid or expired reset token', 400));
  }

  // Set new password
  customer.password = req.body.password;
  customer.resetPasswordToken = undefined;
  customer.resetPasswordExpire = undefined;
  
  await customer.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful'
  });
});

// @desc    Change password by email (public; verifies current password)
// @route   POST /api/customer-auth/change-password-by-email
// @access  Public
const changePasswordByEmail = asyncHandler(async (req, res, next) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return next(new ErrorResponse('Email, current password and new password are required', 400));
  }

  // Find customer by email and include password
  const customer = await Customer.findByEmail(email).select('+password');

  if (!customer) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Verify current password
  const isMatch = await customer.matchPassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Update to new password
  customer.password = newPassword;
  await customer.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
});

module.exports = {
  login,
  getMe,
  updateProfile,
  changePassword,
  getMyOrders,
  getMyOrder,
  logout,
  forgotPassword,
  resetPassword,
  changePasswordByEmail
}; 