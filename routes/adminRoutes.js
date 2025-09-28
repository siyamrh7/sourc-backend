const express = require('express');
const Admin = require('../models/Admin');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const { validateCreateAdmin, validateObjectId } = require('../middleware/validation');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard statistics
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [orderStats, customerStats, adminStats] = await Promise.all([
    Order.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Customer.getCustomerStats(),
    Admin.getAdminStats()
  ]);

  const totalOrders = await Order.countDocuments({ isActive: true });
  const totalCustomers = await Customer.countDocuments({ isActive: true });
  const recentOrders = await Order.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('orderId customer.name status createdAt');

  res.status(200).json({
    success: true,
    data: {
      orderStats,
      customerStats,
      adminStats,
      totals: { totalOrders, totalCustomers },
      recentOrders
    }
  });
}));

// Admin management (super_admin only)
router.get('/admins', authorize('super_admin'), asyncHandler(async (req, res) => {
  const admins = await Admin.find({ isActive: true }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: admins });
}));

router.post('/admins', authorize('super_admin'), validateCreateAdmin, asyncHandler(async (req, res) => {
  const admin = await Admin.create(req.body);
  res.status(201).json({ success: true, data: admin });
}));

module.exports = router; 