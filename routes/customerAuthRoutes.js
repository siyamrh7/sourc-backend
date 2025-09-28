const express = require('express');
const {
  login,
  getMe,
  updateProfile,
  changePassword,
  getMyOrders,
  getMyOrder,
  logout,
  forgotPassword,
  resetPassword
} = require('../controllers/customerAuthController');
const { protectCustomer } = require('../middleware/customerAuth');
const { validateCustomerLogin, validateCustomerProfileUpdate, validatePasswordChange, validateForgotPassword, validateResetPassword } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/customer-auth/login
// @desc    Login customer
// @access  Public
router.post('/login', validateCustomerLogin, login);

// @route   POST /api/customer-auth/logout
// @desc    Logout customer
// @access  Private (Customer)
router.post('/logout', protectCustomer, logout);

// @route   GET /api/customer-auth/me
// @desc    Get current customer
// @access  Private (Customer)
router.get('/me', protectCustomer, getMe);

// @route   PUT /api/customer-auth/update-profile
// @desc    Update customer profile
// @access  Private (Customer)
router.put('/update-profile', protectCustomer, validateCustomerProfileUpdate, updateProfile);

// @route   PUT /api/customer-auth/change-password
// @desc    Change customer password
// @access  Private (Customer)
router.put('/change-password', protectCustomer, validatePasswordChange, changePassword);

// @route   GET /api/customer-auth/orders
// @desc    Get customer's orders
// @access  Private (Customer)
router.get('/orders', protectCustomer, getMyOrders);

// @route   GET /api/customer-auth/orders/:id
// @desc    Get single order
// @access  Private (Customer)
router.get('/orders/:id', protectCustomer, getMyOrder);

// @route   POST /api/customer-auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', validateForgotPassword, forgotPassword);

// @route   PUT /api/customer-auth/reset-password/:resettoken
// @desc    Reset password with token
// @access  Public
router.put('/reset-password/:resettoken', validateResetPassword, resetPassword);

module.exports = router; 