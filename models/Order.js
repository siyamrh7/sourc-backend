const mongoose = require('mongoose');
const moment = require('moment');

const timelineStepSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  estimatedDuration: {
    type: String,
    default: ''
  },
  startDate: {
    type: String,
    default: ''
  },
  finishDate: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Locked', 'In Progress', 'Completed'],
    default: 'Locked'
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  isInProgress: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      const year = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `ORD-${year}-${randomNum}`;
    }
  },
  
  // Customer Information
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    }
  },

  // Product Information
  product: {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    quantity: {
      type: String,
      required: [true, 'Product quantity is required']
    },
    value: {
      type: String,
      required: [true, 'Order value is required']
    },
    description: {
      type: String,
      trim: true
    }
  },

  // Shipping Information
  shipping: {
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true
    },
    method: {
      type: String,
      enum: ['Sea Freight', 'Air Freight', 'Road Transport', 'Express Delivery'],
      default: 'Sea Freight'
    },
    carrier: {
      type: String,
      trim: true
    },
    estimatedArrival: {
      type: String
    }
  },

  // Order Status and Progress
  status: {
    type: String,
    enum: ['Development', 'In Progress', 'Production', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Development'
  },
  
  currentPhase: {
    type: String,
    default: 'Offer Accepted'
  },
  
  progress: {
    current: {
      type: Number,
      default: 1,
      min: 0,
      max: 7
    },
    total: {
      type: Number,
      default: 7
    }
  },

  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },

  // Timeline tracking
  timeline: [timelineStepSchema],

  // Dates
  orderDate: {
    type: Date,
    default: Date.now
  },
  
  estimatedDuration: {
    type: String
  },

  // Notes and additional information
  notes: {
    type: String,
    trim: true
  },

  // Admin tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },

  // System fields
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted order date
orderSchema.virtual('formattedOrderDate').get(function() {
  return moment(this.orderDate).format('M/D/YYYY');
});

// Virtual for progress percentage
orderSchema.virtual('progressPercentage').get(function() {
  return Math.round((this.progress.current / this.progress.total) * 100);
});

// Virtual for status color (for frontend)
orderSchema.virtual('statusColor').get(function() {
  const colorMap = {
    'Development': 'gray',
    'In Progress': 'blue',
    'Production': 'orange',
    'Shipped': 'blue',
    'Delivered': 'green',
    'Cancelled': 'red'
  };
  return colorMap[this.status] || 'gray';
});

// Pre-save middleware to initialize timeline
orderSchema.pre('save', function(next) {
  if (this.isNew && (!this.timeline || this.timeline.length === 0)) {
    this.timeline = [
      {
        id: 1,
        title: 'Offer Accepted',
        description: 'Customer has approved the offer; order has been initiated.',
        estimatedDuration: '1 day',
        startDate: moment().format('M/D/YYYY'),
        finishDate: moment().add(1, 'day').format('M/D/YYYY'),
        status: 'Completed',
        isCompleted: true,
        isInProgress: false,
        isLocked: false
      },
      {
        id: 2,
        title: 'Mold / Product in Development',
        description: 'Product or mold is being created.',
        estimatedDuration: '14 days',
        startDate: '',
        finishDate: '',
        status: 'Locked',
        isCompleted: false,
        isInProgress: false,
        isLocked: true
      },
      {
        id: 3,
        title: 'Sample Sent to Client',
        description: 'Customer receives a sample. Approval required.',
        estimatedDuration: '3 days',
        startDate: '',
        finishDate: '',
        status: 'Locked',
        isCompleted: false,
        isInProgress: false,
        isLocked: true
      },
      {
        id: 4,
        title: 'Sample Approved',
        description: 'Customer has approved the sample. Mass production begins.',
        estimatedDuration: '2 days',
        startDate: '',
        finishDate: '',
        status: 'Locked',
        isCompleted: false,
        isInProgress: false,
        isLocked: true
      },
      {
        id: 5,
        title: 'Production Phase',
        description: 'Final product is being manufactured.',
        estimatedDuration: '',
        startDate: '',
        finishDate: '',
        status: 'Locked',
        isCompleted: false,
        isInProgress: false,
        isLocked: true
      },
      {
        id: 6,
        title: 'Transport Phase',
        description: 'Order has shipped. In transit to the destination country.',
        estimatedDuration: '',
        startDate: '',
        finishDate: '',
        status: 'Locked',
        isCompleted: false,
        isInProgress: false,
        isLocked: true
      },
      {
        id: 7,
        title: 'Delivered to Final Location',
        description: 'Order has been delivered to the specified location.',
        estimatedDuration: '',
        startDate: '',
        finishDate: '',
        status: 'Locked',
        isCompleted: false,
        isInProgress: false,
        isLocked: true
      }
    ];
  }
  next();
});

// Instance method to advance to next phase
orderSchema.methods.advancePhase = function() {
  if (this.progress.current < this.progress.total) {
    // Complete current phase
    if (this.timeline[this.progress.current - 1]) {
      this.timeline[this.progress.current - 1].status = 'Completed';
      this.timeline[this.progress.current - 1].isCompleted = true;
      this.timeline[this.progress.current - 1].isInProgress = false;
      this.timeline[this.progress.current - 1].finishDate = moment().format('M/D/YYYY');
    }

    // Move to next phase
    this.progress.current += 1;
    this.currentPhase = this.timeline[this.progress.current - 1]?.title || this.currentPhase;

    // Start next phase
    if (this.timeline[this.progress.current - 1]) {
      this.timeline[this.progress.current - 1].status = 'In Progress';
      this.timeline[this.progress.current - 1].isInProgress = true;
      this.timeline[this.progress.current - 1].isLocked = false;
      this.timeline[this.progress.current - 1].startDate = moment().format('M/D/YYYY');
    }

    // Update overall status
    this.updateStatus();
  }
};

// Instance method to update overall status based on progress
orderSchema.methods.updateStatus = function() {
  const phaseStatusMap = {
    1: 'Development',
    2: 'Development',
    3: 'In Progress',
    4: 'In Progress',
    5: 'Production',
    6: 'Shipped',
    7: 'Delivered'
  };
  
  this.status = phaseStatusMap[this.progress.current] || 'Development';
};

// Static method to get orders by status
orderSchema.statics.getOrdersByStatus = function(status) {
  return this.find({ status, isActive: true }).populate('customer.customerId', 'name email');
};

// Index for better query performance
orderSchema.index({ orderId: 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderDate: -1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema); 