const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Admin name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
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
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  
  role: {
    type: String,
    enum: ['admin', 'super_admin', 'manager'],
    default: 'admin'
  },
  
  permissions: {
    canCreateOrders: {
      type: Boolean,
      default: true
    },
    canEditOrders: {
      type: Boolean,
      default: true
    },
    canDeleteOrders: {
      type: Boolean,
      default: false
    },
    canManageCustomers: {
      type: Boolean,
      default: true
    },
    canViewReports: {
      type: Boolean,
      default: true
    },
    canManageAdmins: {
      type: Boolean,
      default: false
    },
    canViewFinancials: {
      type: Boolean,
      default: false
    }
  },
  
  profile: {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      enum: ['Operations', 'Sales', 'Customer Service', 'Management', 'IT'],
      default: 'Operations'
    },
    position: {
      type: String,
      trim: true
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
  
  // Login tracking
  lastLogin: {
    type: Date
  },
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date
  },
  
  // Password reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Activity tracking
  ordersCreated: {
    type: Number,
    default: 0
  },
  
  ordersModified: {
    type: Number,
    default: 0
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.name;
});

// Virtual for account locked status
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Encrypt password before saving
adminSchema.pre('save', async function(next) {
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
adminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate JWT token
adminSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role 
    },
    process.env.JWT_SECRET || 'fallback_secret',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    }
  );
};

// Instance method to increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  // If previous attempt was more than 2 hours ago, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: Date.now() }
  });
};

// Instance method to update activity
adminSchema.methods.updateActivity = function(activity = {}) {
  const updates = { lastActivity: Date.now() };
  
  if (activity.ordersCreated) {
    updates.$inc = { ordersCreated: 1 };
  }
  
  if (activity.ordersModified) {
    updates.$inc = { ...(updates.$inc || {}), ordersModified: 1 };
  }
  
  return this.updateOne(updates);
};

// Static method to find admin by email
adminSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

// Static method to get admin statistics
adminSchema.statics.getAdminStats = async function() {
  try {
    const stats = await this.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          totalAdmins: { $sum: 1 },
          totalOrdersCreated: { $sum: '$ordersCreated' },
          totalOrdersModified: { $sum: '$ordersModified' },
          averageOrdersPerAdmin: { $avg: '$ordersCreated' }
        }
      }
    ]);
    
    return stats[0] || {
      totalAdmins: 0,
      totalOrdersCreated: 0,
      totalOrdersModified: 0,
      averageOrdersPerAdmin: 0
    };
  } catch (error) {
    console.error('Error getting admin statistics:', error);
    return null;
  }
};

// Static method to check permissions
adminSchema.statics.hasPermission = function(admin, permission) {
  if (!admin || !admin.permissions) return false;
  
  // Super admin has all permissions
  if (admin.role === 'super_admin') return true;
  
  return admin.permissions[permission] === true;
};

// Pre-save middleware to set default permissions based on role
adminSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    switch (this.role) {
      case 'super_admin':
        this.permissions = {
          canCreateOrders: true,
          canEditOrders: true,
          canDeleteOrders: true,
          canManageCustomers: true,
          canViewReports: true,
          canManageAdmins: true,
          canViewFinancials: true
        };
        break;
      
      case 'manager':
        this.permissions = {
          canCreateOrders: true,
          canEditOrders: true,
          canDeleteOrders: true,
          canManageCustomers: true,
          canViewReports: true,
          canManageAdmins: false,
          canViewFinancials: true
        };
        break;
      
      default: // admin
        this.permissions = {
          canCreateOrders: true,
          canEditOrders: true,
          canDeleteOrders: false,
          canManageCustomers: true,
          canViewReports: true,
          canManageAdmins: false,
          canViewFinancials: false
        };
    }
  }
  next();
});

// Index for better query performance
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ 'profile.department': 1 });
adminSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('Admin', adminSchema); 