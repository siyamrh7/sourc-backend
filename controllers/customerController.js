const Customer = require('../models/Customer');
const Order = require('../models/Order');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private (Admin)
const getCustomers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, search, sort = '-createdAt' } = req.query;
  
  // Build query
  let query = { isActive: true };
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { 'company.name': { $regex: search, $options: 'i' } }
    ];
  }
  
  // Execute query with pagination
  const customers = await Customer.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-password');
  
  // Get total count for pagination
  const total = await Customer.countDocuments(query);
  
  res.status(200).json({
    success: true,
    data: customers,
    pagination: {
      current: page,
      total: Math.ceil(total / limit),
      count: customers.length,
      totalRecords: total
    }
  });
});

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private (Admin)
const getCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id).select('-password');
  
  if (!customer) {
    return next(new ErrorResponse('Customer not found', 404));
  }
  
  // Get customer's orders
  const orders = await Order.find({ 
    'customer.email': customer.email,
    isActive: true 
  }).sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    data: {
      customer,
      orders
    }
  });
});

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private (Admin)
const createCustomer = asyncHandler(async (req, res, next) => {
  // Check if customer with email already exists
  const existingCustomer = await Customer.findByEmail(req.body.email);
  
  if (existingCustomer) {
    return next(new ErrorResponse('Customer with this email already exists', 400));
  }
  
  // Create customer
  const customer = await Customer.create(req.body);
  
  // Remove password from response
  customer.password = undefined;
  
  res.status(201).json({
    success: true,
    data: customer
  });
});

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private (Admin)
const updateCustomer = asyncHandler(async (req, res, next) => {
  let customer = await Customer.findById(req.params.id);
  
  if (!customer) {
    return next(new ErrorResponse('Customer not found', 404));
  }
  
  // Don't allow updating password through this route
  if (req.body.password) {
    delete req.body.password;
  }
  
  // Check if email is being changed and if new email exists
  if (req.body.email && req.body.email !== customer.email) {
    const existingCustomer = await Customer.findByEmail(req.body.email);
    if (existingCustomer) {
      return next(new ErrorResponse('Customer with this email already exists', 400));
    }
  }
  
  customer = await Customer.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).select('-password');
  
  res.status(200).json({
    success: true,
    data: customer
  });
});

// @desc    Delete customer (soft delete)
// @route   DELETE /api/customers/:id
// @access  Private (Admin)
const deleteCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id);
  
  if (!customer) {
    return next(new ErrorResponse('Customer not found', 404));
  }
  
  // Soft delete
  customer.isActive = false;
  await customer.save();
  
  res.status(200).json({
    success: true,
    message: 'Customer deleted successfully'
  });
});

// @desc    Reset customer password
// @route   PUT /api/customers/:id/reset-password
// @access  Private (Admin)
const resetCustomerPassword = asyncHandler(async (req, res, next) => {
  const { newPassword } = req.body;
  
  if (!newPassword) {
    return next(new ErrorResponse('New password is required', 400));
  }
  
  const customer = await Customer.findById(req.params.id);
  
  if (!customer) {
    return next(new ErrorResponse('Customer not found', 404));
  }
  
  // Update password (will be hashed by pre-save middleware)
  customer.password = newPassword;
  await customer.save();
  
  res.status(200).json({
    success: true,
    message: 'Customer password reset successfully'
  });
});

// @desc    Get customer statistics
// @route   GET /api/customers/stats
// @access  Private (Admin)
const getCustomerStats = asyncHandler(async (req, res, next) => {
  const stats = await Customer.getCustomerStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  resetCustomerPassword,
  getCustomerStats
}; 