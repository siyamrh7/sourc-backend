const Order = require('../models/Order');
const Customer = require('../models/Customer');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// Helper function to find order by either MongoDB ObjectId or custom orderId
const findOrderByIdOrOrderId = async (identifier) => {
  let order;
  
  // Check if it's a valid MongoDB ObjectId (24 hex characters)
  if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
    order = await Order.findOne({ _id: identifier, isActive: true });
  } else {
    // Assume it's a custom orderId
    order = await Order.findOne({ orderId: identifier, isActive: true });
  }
  
  return order;
};

// Helper to find order regardless of isActive (for hard delete)
const findAnyOrderByIdOrOrderId = async (identifier) => {
  let order;
  if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
    order = await Order.findOne({ _id: identifier });
  } else {
    order = await Order.findOne({ orderId: identifier });
  }
  return order;
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private (Admin)
const getOrders = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    status,
    priority,
    search,
    sort = '-createdAt'
  } = req.query;

  // Build filter object
  const filter = { isActive: true };

  if (status && status !== 'All') {
    filter.status = status;
  }

  if (priority && priority !== 'All') {
    filter.priority = priority;
  }

  if (search) {
    filter.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
      { 'customer.email': { $regex: search, $options: 'i' } },
      { 'product.name': { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query
  const orders = await Order.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('createdBy', 'name email')
    .populate('lastUpdatedBy', 'name email');

  // Get total count for pagination
  const total = await Order.countDocuments(filter);

  // Calculate pagination info
  const totalPages = Math.ceil(total / parseInt(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.status(200).json({
    success: true,
    count: orders.length,
    pagination: {
      current: parseInt(page),
      pages: totalPages,
      total,
      hasNext: hasNextPage,
      hasPrev: hasPrevPage
    },
    data: orders
  });
});

// @desc    Get single order
// @route   GET /api/orders/:orderId
// @access  Private (Admin)
const getOrder = asyncHandler(async (req, res, next) => {
  const order = await findOrderByIdOrOrderId(req.params.orderId);

  if (!order) {
    return next(new ErrorResponse(`Order ${req.params.orderId} not found`, 404));
  }

  // Populate additional fields
  await order.populate([
    { path: 'createdBy', select: 'name email role' },
    { path: 'lastUpdatedBy', select: 'name email role' },
    { path: 'customer.customerId', select: 'name email phone company' }
  ]);

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Admin with canCreateOrders permission)
const createOrder = asyncHandler(async (req, res, next) => {
  // Add admin who created the order
  req.body.createdBy = req.admin._id;
  req.body.lastUpdatedBy = req.admin._id;

  // Generate unique order ID if not provided
  if (!req.body.orderId) {
    const year = new Date().getFullYear();
    let isUnique = false;
    let orderId;

    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      orderId = `ORD-${year}-${randomNum}`;
      
      const existingOrder = await Order.findOne({ orderId });
      if (!existingOrder) {
        isUnique = true;
      }
    }
    
    req.body.orderId = orderId;
  }

  // Handle customer information
  let customer = await Customer.findByEmail(req.body.customer.email);
  
  if (!customer) {
    // Create new customer if doesn't exist
    customer = await Customer.create({
      name: req.body.customer.name,
      email: req.body.customer.email,
      phone: req.body.customer.phone,
      company: req.body.customer.company || {
        name: req.body.customer.name
      }
    });
  }

  // Add customer reference
  req.body.customer.customerId = customer._id;

  // Set default timeline if not provided
  if (!req.body.timeline || req.body.timeline.length === 0) {
    const defaultTimeline = [
      {
        id: 1,
        title: 'Offer Accepted',
        description: 'Customer has approved the offer; order has been initiated.',
        estimatedDuration: '1 day'
      },
      {
        id: 2,
        title: 'Mold / Product in Development',
        description: 'Product or mold is being created.',
        estimatedDuration: '14 days'
      },
      {
        id: 3,
        title: 'Sample Sent to Client',
        description: 'Customer receives a sample. Approval required.',
        estimatedDuration: '3 days'
      },
      {
        id: 4,
        title: 'Sample Approved',
        description: 'Customer has approved the sample. Mass production begins.',
        estimatedDuration: '2 days'
      },
      {
        id: 5,
        title: 'Production Phase',
        description: 'Final product is being manufactured.',
        estimatedDuration: '21 days'
      },
      {
        id: 6,
        title: 'Transport Phase',
        description: 'Order has shipped. In transit to the destination country.',
        estimatedDuration: '7 days'
      },
      {
        id: 7,
        title: 'Delivered to Final Location',
        description: 'Order has been delivered to the specified location.',
        estimatedDuration: '1 day'
      }
    ];

    // Set default progress if not provided
    if (!req.body.progress) {
      req.body.progress = {
        current: 1,
        total: 7
      };
    }

    // Map order status to progress if progress not explicitly set
    if (!req.body.progress.current || req.body.progress.current === 1) {
      switch (req.body.status?.toLowerCase()) {
        case 'development':
          req.body.progress.current = 2;
          break;
        case 'in progress':
          req.body.progress.current = 4;
          break;
        case 'production':
          req.body.progress.current = 5;
          break;
        case 'shipped':
          req.body.progress.current = 6;
          break;
        case 'delivered':
          req.body.progress.current = 7;
          break;
        default:
          req.body.progress.current = 1;
      }
    }

    // Set timeline step status based on progress
    const currentProgress = req.body.progress.current;
    req.body.timeline = defaultTimeline.map((step, index) => {
      const stepPosition = index + 1;
      
      if (stepPosition < currentProgress) {
        return {
          ...step,
          status: 'Completed',
          isCompleted: true,
          isInProgress: false,
          isLocked: false
        };
      } else if (stepPosition === currentProgress) {
        return {
          ...step,
          status: 'In Progress',
          isCompleted: false,
          isInProgress: true,
          isLocked: false
        };
      } else {
        return {
          ...step,
          status: 'Locked',
          isCompleted: false,
          isInProgress: false,
          isLocked: true
        };
      }
    });
  }

  // Set default progress if not provided (in case timeline was provided)
  if (!req.body.progress) {
    req.body.progress = {
      current: 1,
      total: 7
    };
  }

  // Set current phase based on progress
  if (!req.body.currentPhase && req.body.timeline && req.body.timeline.length > 0) {
    const currentStepIndex = (req.body.progress.current || 1) - 1;
    if (req.body.timeline[currentStepIndex]) {
      req.body.currentPhase = req.body.timeline[currentStepIndex].title;
    }
  }

  // Create order
  const order = await Order.create(req.body);

  // Update customer statistics
  await customer.updateStatistics();

  // Update admin activity
  await req.admin.updateActivity({ ordersCreated: true });

  res.status(201).json({
    success: true,
    message: `Order ${order.orderId} created successfully`,
    data: order
  });
});

// @desc    Update order
// @route   PUT /api/orders/:orderId
// @access  Private (Admin with canEditOrders permission)
const updateOrder = asyncHandler(async (req, res, next) => {
  let order = await findOrderByIdOrOrderId(req.params.orderId);

  if (!order) {
    return next(new ErrorResponse(`Order ${req.params.orderId} not found`, 404));
  }

  // Add admin who updated the order
  req.body.lastUpdatedBy = req.admin._id;

  // Handle customer updates
  if (req.body.customer?.email && req.body.customer.email !== order.customer.email) {
    let customer = await Customer.findByEmail(req.body.customer.email);
    
    if (!customer) {
      // Create new customer if doesn't exist
      customer = await Customer.create({
        name: req.body.customer.name,
        email: req.body.customer.email,
        phone: req.body.customer.phone,
        company: req.body.customer.company
      });
    }
    
    req.body.customer.customerId = customer._id;
  }

  // Handle timeline updates with proper structure and enforce 7 steps
  if (req.body.timeline && Array.isArray(req.body.timeline)) {
    // Base 7-step template
    const defaultTimeline = [
      { id: 1, title: 'Offer Accepted', description: 'Customer has approved the offer; order has been initiated.', estimatedDuration: '1 day' },
      { id: 2, title: 'Mold / Product in Development', description: 'Product or mold is being created.', estimatedDuration: '14 days' },
      { id: 3, title: 'Sample Sent to Client', description: 'Customer receives a sample. Approval required.', estimatedDuration: '3 days' },
      { id: 4, title: 'Sample Approved', description: 'Customer has approved the sample. Mass production begins.', estimatedDuration: '2 days' },
      { id: 5, title: 'Production Phase', description: 'Final product is being manufactured.', estimatedDuration: '21 days' },
      { id: 6, title: 'Transport Phase', description: 'Order has shipped. In transit to the destination country.', estimatedDuration: '7 days' },
      { id: 7, title: 'Delivered to Final Location', description: 'Order has been delivered to the specified location.', estimatedDuration: '1 day' }
    ];

    // Normalize provided steps, then enforce exactly 7 by aligning to template
    const normalizedIncoming = req.body.timeline.map((step, index) => ({
      id: step.id || (index + 1),
      title: step.title || defaultTimeline[index]?.title || `Step ${index + 1}`,
      description: step.description || defaultTimeline[index]?.description || '',
      estimatedDuration: step.estimatedDuration || defaultTimeline[index]?.estimatedDuration || '',
      startDate: step.startDate || '',
      finishDate: step.finishDate || '',
      status: step.status || (step.isCompleted ? 'Completed' : step.isInProgress ? 'In Progress' : 'Locked'),
      isCompleted: step.isCompleted || false,
      isInProgress: step.isInProgress || false,
      isLocked: step.isLocked !== false
    }));

    // Build the 7-step timeline either from provided or defaults
    const enforcedTimeline = defaultTimeline.map((tpl, idx) => {
      const provided = normalizedIncoming[idx];
      if (provided) {
        // Merge provided onto template, keeping required fields
        return {
          id: tpl.id,
          title: provided.title || tpl.title,
          description: provided.description || tpl.description,
          estimatedDuration: provided.estimatedDuration || tpl.estimatedDuration,
          startDate: provided.startDate || '',
          finishDate: provided.finishDate || '',
          status: provided.status,
          isCompleted: provided.isCompleted,
          isInProgress: provided.isInProgress,
          isLocked: provided.isLocked
        };
      }
      // If missing, lock remaining steps by default
      return {
        id: tpl.id,
        title: tpl.title,
        description: tpl.description,
        estimatedDuration: tpl.estimatedDuration,
        startDate: '',
        finishDate: '',
        status: 'Locked',
        isCompleted: false,
        isInProgress: false,
        isLocked: true
      };
    });

    // Update progress based on completed and in-progress steps, clamp 1..7
    const completedSteps = enforcedTimeline.filter(step => step.isCompleted).length;
    const inProgressSteps = enforcedTimeline.filter(step => step.isInProgress).length;

    if (!req.body.progress) {
      req.body.progress = {};
    }

    const computedCurrent = completedSteps + (inProgressSteps > 0 ? 1 : 0);
    req.body.progress.current = Math.min(Math.max(computedCurrent, 1), 7);
    req.body.progress.total = 7;

    // Ensure only one step is In Progress (the current one)
    const currentIndex = req.body.progress.current - 1;
    enforcedTimeline.forEach((item, index) => {
      if (index < currentIndex) {
        item.status = 'Completed';
        item.isCompleted = true;
        item.isInProgress = false;
        item.isLocked = false;
      } else if (index === currentIndex) {
        item.status = 'In Progress';
        item.isCompleted = false;
        item.isInProgress = true;
        item.isLocked = false;
      } else {
        item.status = 'Locked';
        item.isCompleted = false;
        item.isInProgress = false;
        item.isLocked = true;
      }
    });

    req.body.timeline = enforcedTimeline;

    // Set current phase label
    req.body.currentPhase = enforcedTimeline[currentIndex]?.title || 'Offer Accepted';
  }

  // Update progress-based status if not explicitly provided
  if (req.body.progress && !req.body.status) {
    const progressPercent = (req.body.progress.current / req.body.progress.total) * 100;
    if (progressPercent >= 100) {
      req.body.status = 'Delivered';
    } else if (progressPercent >= 85) {
      req.body.status = 'Shipped';
    } else if (progressPercent >= 70) {
      req.body.status = 'Production';
    } else if (progressPercent >= 30) {
      req.body.status = 'In Progress';
    } else {
      req.body.status = 'Development';
    }
  }

  // Determine the update method based on identifier type
  let updatedOrder;
  if (/^[0-9a-fA-F]{24}$/.test(req.params.orderId)) {
    // MongoDB ObjectId
    updatedOrder = await Order.findByIdAndUpdate(
      req.params.orderId,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
  } else {
    // Custom orderId
    updatedOrder = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
  }

  // Update customer statistics if customer changed
  if (req.body.customer?.email) {
    const customer = await Customer.findByEmail(req.body.customer.email);
    if (customer) {
      await customer.updateStatistics();
    }
  }

  // Update admin activity
  await req.admin.updateActivity({ ordersModified: true });

  res.status(200).json({
    success: true,
    message: `Order ${updatedOrder.orderId} updated successfully`,
    data: updatedOrder
  });
});

// @desc    Advance order to next phase
// @route   PATCH /api/orders/:orderId/advance
// @access  Private (Admin with canEditOrders permission)
const advanceOrderPhase = asyncHandler(async (req, res, next) => {
  const order = await findOrderByIdOrOrderId(req.params.orderId);

  if (!order) {
    return next(new ErrorResponse(`Order ${req.params.orderId} not found`, 404));
  }

  if (order.progress.current >= order.progress.total) {
    return next(new ErrorResponse('Order is already at the final phase', 400));
  }

  // Advance to next phase
  order.advancePhase();
  order.lastUpdatedBy = req.admin._id;

  await order.save();

  // Update admin activity
  await req.admin.updateActivity({ ordersModified: true });

  res.status(200).json({
    success: true,
    message: `Order ${order.orderId} advanced to ${order.currentPhase}`,
    data: order
  });
});

// @desc    Update order phase manually
// @route   PATCH /api/orders/:orderId/phase
// @access  Private (Admin with canEditOrders permission)
const updateOrderPhase = asyncHandler(async (req, res, next) => {
  const { phase, progress } = req.body;

  const order = await findOrderByIdOrOrderId(req.params.orderId);

  if (!order) {
    return next(new ErrorResponse(`Order ${req.params.orderId} not found`, 404));
  }

  // Validate phase exists in timeline
  const phaseIndex = order.timeline.findIndex(item => item.title === phase);
  if (phaseIndex === -1) {
    return next(new ErrorResponse('Invalid phase specified', 400));
  }

  // Update progress and phase
  if (progress !== undefined) {
    order.progress.current = Math.min(Math.max(progress, 0), order.progress.total);
  } else {
    order.progress.current = phaseIndex + 1;
  }

  order.currentPhase = phase;
  order.lastUpdatedBy = req.admin._id;

  // Update timeline status
  order.timeline.forEach((item, index) => {
    if (index < order.progress.current - 1) {
      item.status = 'Completed';
      item.isCompleted = true;
      item.isInProgress = false;
      item.isLocked = false;
    } else if (index === order.progress.current - 1) {
      item.status = 'In Progress';
      item.isCompleted = false;
      item.isInProgress = true;
      item.isLocked = false;
    } else {
      item.status = 'Locked';
      item.isCompleted = false;
      item.isInProgress = false;
      item.isLocked = true;
    }
  });

  // Update overall status
  order.updateStatus();

  await order.save();

  // Update admin activity
  await req.admin.updateActivity({ ordersModified: true });

  res.status(200).json({
    success: true,
    message: `Order ${order.orderId} updated to ${phase}`,
    data: order
  });
});

// @desc    Delete order (soft delete)
// @route   DELETE /api/orders/:orderId
// @access  Private (Admin with canDeleteOrders permission)
const deleteOrder = asyncHandler(async (req, res, next) => {
  const order = await findOrderByIdOrOrderId(req.params.orderId);

  if (!order) {
    return next(new ErrorResponse(`Order ${req.params.orderId} not found`, 404));
  }

  // Soft delete - mark as inactive
  order.isActive = false;
  order.lastUpdatedBy = req.admin._id;
  await order.save();

  // Update customer statistics
  const customer = await Customer.findByEmail(order.customer.email);
  if (customer) {
    await customer.updateStatistics();
  }

  res.status(200).json({
    success: true,
    message: `Order ${order.orderId} deleted successfully`
  });
});

// @desc    Delete order permanently (hard delete)
// @route   DELETE /api/orders/:orderId/hard
// @access  Private (Admin with canDeleteOrders permission)
const hardDeleteOrder = asyncHandler(async (req, res, next) => {
  const order = await findAnyOrderByIdOrOrderId(req.params.orderId);

  if (!order) {
    return next(new ErrorResponse(`Order ${req.params.orderId} not found`, 404));
  }

  await Order.deleteOne({ _id: order._id });

  // Update admin activity
  await req.admin.updateActivity({ ordersModified: true });

  res.status(200).json({
    success: true,
    message: `Order ${order.orderId} permanently deleted`
  });
});

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private (Admin)
const getOrderStats = asyncHandler(async (req, res, next) => {
  const stats = await Order.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { 
          $sum: { 
            $toDouble: { 
              $replaceAll: { 
                input: { $replaceAll: { input: '$product.value', find: '€', replacement: '' } },
                find: ',',
                replacement: ''
              }
            }
          }
        }
      }
    }
  ]);

  // Calculate total orders and revenue
  const totalStats = await Order.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { 
          $sum: { 
            $toDouble: { 
              $replaceAll: { 
                input: { $replaceAll: { input: '$product.value', find: '€', replacement: '' } },
                find: ',',
                replacement: ''
              }
            }
          }
        },
        averageOrderValue: { 
          $avg: { 
            $toDouble: { 
              $replaceAll: { 
                input: { $replaceAll: { input: '$product.value', find: '€', replacement: '' } },
                find: ',',
                replacement: ''
              }
            }
          }
        }
      }
    }
  ]);

  // Recent orders
  const recentOrders = await Order.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('orderId customer.name product.name status createdAt');

  res.status(200).json({
    success: true,
    data: {
      statusBreakdown: stats,
      totals: totalStats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
      recentOrders
    }
  });
});

// @desc    Search orders
// @route   GET /api/orders/search
// @access  Private (Admin)
const searchOrders = asyncHandler(async (req, res, next) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return next(new ErrorResponse('Search query must be at least 2 characters', 400));
  }

  const orders = await Order.find({
    isActive: true,
    $or: [
      { orderId: { $regex: q, $options: 'i' } },
      { 'customer.name': { $regex: q, $options: 'i' } },
      { 'customer.email': { $regex: q, $options: 'i' } },
      { 'product.name': { $regex: q, $options: 'i' } },
      { 'shipping.destination': { $regex: q, $options: 'i' } }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(20)
  .select('orderId customer product status priority createdAt');

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

module.exports = {
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
}; 