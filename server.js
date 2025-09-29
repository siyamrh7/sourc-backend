const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const orderRoutes = require('./routes/orderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const customerAuthRoutes = require('./routes/customerAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      process.env.CLIENT_URL
    ].filter(Boolean);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// Apply CORS early so preflight responses include headers
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security middleware
app.use(helmet());

// Rate limiting
// Global limiter (relaxed/disabled in development to avoid noisy 429s during local work)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max:
    process.env.NODE_ENV === 'production'
      ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
      : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Don't rate-limit preflight or health checks
  skip: (req) => req.method === 'OPTIONS' || req.path === '/api/health'
});

if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}

// Route-specific limiter for auth endpoints to protect against brute-force
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // allow up to 20 login attempts per IP per minute in dev/prod
  message: { error: 'Too many login attempts, please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS'
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/sourc_orders',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Handle application termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

// API Routes
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/customer-auth/login', loginLimiter);
app.use('/api/customer-auth', customerAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SOURC Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to SOURC Order Management API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      orders: '/api/orders',
      customers: '/api/customers',
      admin: '/api/admin',
      auth: '/api/auth'
    }
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 SOURC Backend Server is running!
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/sourc_orders'}
🔗 API Base: http://localhost:${PORT}/api
📖 Health Check: http://localhost:${PORT}/api/health
  `);
}); 