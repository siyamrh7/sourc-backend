const express = require('express');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  advanceOrderPhase,
  updateOrderPhase,
  deleteOrder,
  hardDeleteOrder,
  getOrderStats,
  searchOrders
} = require('../controllers/orderController');

const { protect, checkPermission, logAdminAction } = require('../middleware/auth');
const {
  validateCreateOrder,
  validateUpdateOrder,
  validateOrderId,
  validateOrderQuery
} = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Order statistics route (before :orderId to avoid conflicts)
router.get('/stats', checkPermission('canViewReports'), getOrderStats);

// Search orders
router.get('/search', validateOrderQuery, searchOrders);

// Main order routes
router
  .route('/')
  .get(validateOrderQuery, getOrders)
  .post(
    checkPermission('canCreateOrders'),
    validateCreateOrder,
    logAdminAction('CREATE_ORDER'),
    createOrder
  );

router
  .route('/:orderId')
  .get(validateOrderId, getOrder)
  .put(
    checkPermission('canEditOrders'),
    validateOrderId,
    validateUpdateOrder,
    logAdminAction('UPDATE_ORDER'),
    updateOrder
  )
  .delete(
    checkPermission('canDeleteOrders'),
    validateOrderId,
    logAdminAction('DELETE_ORDER'),
    deleteOrder
  );

// Hard delete permanently
router.delete(
  '/:orderId/hard',
  checkPermission('canDeleteOrders'),
  validateOrderId,
  logAdminAction('HARD_DELETE_ORDER'),
  hardDeleteOrder
);

// Order phase management
router.patch(
  '/:orderId/advance',
  checkPermission('canEditOrders'),
  validateOrderId,
  logAdminAction('ADVANCE_ORDER_PHASE'),
  advanceOrderPhase
);

router.patch(
  '/:orderId/phase',
  checkPermission('canEditOrders'),
  validateOrderId,
  logAdminAction('UPDATE_ORDER_PHASE'),
  updateOrderPhase
);

module.exports = router; 