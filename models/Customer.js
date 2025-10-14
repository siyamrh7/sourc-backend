const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  
  phone: {
    type: String,
    trim: true,
    match: [
      /^[\+]?[1-9][\d]{0,15}$/,
      'Please enter a valid phone number'
    ]
  },
  
  fullAddress: {
    type: String,
    trim: true
  },
  
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },

  // Password reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  company: {
    name: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    website: {
      type: String,
      trim: true
    },
    industry: {
      type: String,
      trim: true
    },
    kvk: {
      type: String,
      trim: true
    }
  },
  
  contactPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    phone: {
      type: Boolean,
      default: true
    }
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Statistics
  totalOrders: {
    type: Number,
    default: 0
  },
  
  totalSpent: {
    type: Number,
    default: 0
  },
  
  averageOrderValue: {
    type: Number,
    default: 0
  },
  
  // Dates
  lastOrderDate: {
    type: Date
  },
  
  lastLoginDate: {
    type: Date
  },
  
  // Notes for internal use
  notes: {
    type: String,
    trim: true
  },
  
  // Customer type/tier
  customerType: {
    type: String,
    enum: ['business', 'individual'],
    default: 'business'
  },
  
  // Credit limit (if applicable)
  creditLimit: {
    type: Number,
    default: 0
  },
  
  // Payment terms
  paymentTerms: {
    type: String,
    enum: ['Immediate', 'Net 15', 'Net 30', 'Net 60', 'Custom'],
    default: 'Net 30'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for display name (company name or personal name)
customerSchema.virtual('displayName').get(function() {
  return this.company.name || this.name;
});

// Encrypt password before saving
customerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
customerSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate JWT token
customerSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, type: 'customer' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Instance method to match password
customerSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate password reset token
customerSchema.methods.getResetPasswordToken = function() {
  const crypto = require('crypto');
  
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Instance method to update statistics
customerSchema.methods.updateStatistics = async function() {
  const Order = mongoose.model('Order');
  
  try {
    const orders = await Order.find({ 
      'customer.email': this.email,
      isActive: true 
    });
    
    this.totalOrders = orders.length;
    
    if (orders.length > 0) {
      // Calculate total spent using totalValue if present, otherwise sum products
      this.totalSpent = orders.reduce((total, order) => {
        if (typeof order.totalValue === 'number') {
          return total + order.totalValue;
        }
        if (Array.isArray(order.products)) {
          const sum = order.products.reduce((s, p) => s + (parseFloat(p.value) || 0), 0);
          return total + sum;
        }
        const legacy = order.product?.value ? parseFloat(String(order.product.value).replace(/[^0-9.-]+/g, '')) || 0 : 0;
        return total + legacy;
      }, 0);
      
      // Calculate average order value
      this.averageOrderValue = this.totalSpent / this.totalOrders;
      
      // Update last order date
      const lastOrder = orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))[0];
      this.lastOrderDate = lastOrder.orderDate;
    }
    
    await this.save();
  } catch (error) {
    console.error('Error updating customer statistics:', error);
  }
};

// Static method to find customer by email
customerSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to get customer statistics
customerSchema.statics.getCustomerStats = async function() {
  try {
    const stats = await this.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          totalSpent: { $sum: '$totalSpent' },
          averageOrderValue: { $avg: '$averageOrderValue' },
          averageOrdersPerCustomer: { $avg: '$totalOrders' }
        }
      }
    ]);
    
    return stats[0] || {
      totalCustomers: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      averageOrdersPerCustomer: 0
    };
  } catch (error) {
    console.error('Error getting customer statistics:', error);
    return null;
  }
};

// Index for better query performance
customerSchema.index({ email: 1 });
customerSchema.index({ 'company.name': 1 });
customerSchema.index({ customerType: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Customer', customerSchema); 