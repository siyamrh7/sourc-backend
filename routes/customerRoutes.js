const express = require('express');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  resetCustomerPassword,
  getCustomerStats
} = require('../controllers/customerController');
const { protect, checkPermission } = require('../middleware/auth');
const { validateCreateCustomer, validateUpdateCustomer, validateObjectId } = require('../middleware/validation');

const router = express.Router();

// All routes require admin authentication
router.use(protect);

// Get customer statistics
router.get('/stats', checkPermission('canManageCustomers'), getCustomerStats);

// Get all customers
router.get('/', checkPermission('canManageCustomers'), getCustomers);

// Create customer
router.post('/', checkPermission('canManageCustomers'), validateCreateCustomer, createCustomer);

// Get single customer
router.get('/:id', checkPermission('canManageCustomers'), validateObjectId, getCustomer);

// Update customer
router.put('/:id', checkPermission('canManageCustomers'), validateObjectId, validateUpdateCustomer, updateCustomer);

// Delete customer (soft delete)
router.delete('/:id', checkPermission('canManageCustomers'), validateObjectId, deleteCustomer);

// Reset customer password
router.put('/:id/reset-password', checkPermission('canManageCustomers'), validateObjectId, resetCustomerPassword);

module.exports = router; 