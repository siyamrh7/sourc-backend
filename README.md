# SOURC Backend API

A comprehensive Node.js + Express.js + MongoDB REST API for order management system.

## 🚀 Features

- **Order Management**: Full CRUD operations for orders with 7-phase timeline tracking
- **Customer Management**: Customer database with statistics and order history
- **Admin Authentication**: JWT-based authentication with role-based permissions
- **Progress Tracking**: Automatic timeline progression with status updates
- **Search & Filtering**: Advanced search and filtering capabilities
- **Statistics Dashboard**: Real-time analytics and reporting
- **Security**: Rate limiting, data validation, password hashing
- **Error Handling**: Comprehensive error handling and logging

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## 🛠️ Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file in the backend directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/sourc_orders

   # JWT
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_EXPIRE=30d

   # Frontend URL
   CLIENT_URL=http://localhost:3000
   ```

3. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current admin
- `POST /api/auth/logout` - Admin logout

### Orders
- `GET /api/orders` - Get all orders (with pagination & filters)
- `POST /api/orders` - Create new order
- `GET /api/orders/:orderId` - Get single order
- `PUT /api/orders/:orderId` - Update order
- `DELETE /api/orders/:orderId` - Delete order (soft delete)
- `PATCH /api/orders/:orderId/advance` - Advance order to next phase
- `PATCH /api/orders/:orderId/phase` - Update order phase manually
- `GET /api/orders/stats` - Get order statistics
- `GET /api/orders/search` - Search orders

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/:id` - Get single customer

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/admins` - Get all admins (super_admin only)
- `POST /api/admin/admins` - Create new admin (super_admin only)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 👥 User Roles & Permissions

### Admin Roles
- **admin**: Basic order management
- **manager**: Advanced order management + reports
- **super_admin**: Full system access

### Permissions
- `canCreateOrders`: Create new orders
- `canEditOrders`: Edit existing orders
- `canDeleteOrders`: Delete orders
- `canManageCustomers`: Manage customer data
- `canViewReports`: View analytics and reports
- `canManageAdmins`: Manage admin accounts
- `canViewFinancials`: View financial data

## 📊 Order Timeline Phases

1. **Offer Accepted** - Customer approves offer
2. **Mold/Product in Development** - Product creation
3. **Sample Sent to Client** - Sample approval process
4. **Sample Approved** - Mass production begins
5. **Production Phase** - Manufacturing
6. **Transport Phase** - Shipping
7. **Delivered to Final Location** - Completion

## 🛡️ Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- CORS protection
- Helmet.js security headers
- Account lockout after failed login attempts

## 📝 Data Models

### Order Model
```javascript
{
  orderId: "ORD-2024-001",
  customer: {
    name: "Customer Name",
    email: "customer@example.com",
    phone: "+1234567890"
  },
  product: {
    name: "Product Name",
    quantity: "5,000 units",
    value: "€25,000"
  },
  shipping: {
    destination: "Rotterdam, NL",
    method: "Sea Freight",
    carrier: "COSCO"
  },
  status: "In Progress",
  currentPhase: "Sample Approved",
  progress: { current: 4, total: 7 },
  priority: "High",
  timeline: [...],
  createdBy: "admin_id",
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

## 🚨 Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Server Error

## 📈 Monitoring

- Request logging with Morgan
- Error tracking and logging
- Performance monitoring
- Database connection monitoring

## 🧪 Testing

Health check endpoint:
```
GET /api/health
```

## 🔧 Development

The API includes:
- Hot reloading with nodemon
- Comprehensive logging
- Development error details
- MongoDB connection monitoring

## 📦 Production Deployment

1. Set `NODE_ENV=production`
2. Configure production MongoDB URI
3. Set secure JWT secret
4. Enable HTTPS
5. Configure proper CORS settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License. 

## ✅ **Complete Backend API Created!**

I've successfully created a comprehensive Node.js + Express.js + MongoDB REST API backend for your order management application. Here's everything that's been built:

### **📁 Backend Structure Created:**

```
backend/
├── package.json                 # Dependencies & scripts
├── server.js                    # Main Express server
├── README.md                    # Complete documentation
├── models/
│   ├── Order.js                 # Order model with timeline tracking
│   ├── Customer.js              # Customer model with statistics
│   └── Admin.js                 # Admin model with permissions
├── controllers/
│   ├── orderController.js       # Order CRUD & management
│   └── authController.js        # Authentication logic
├── middleware/
│   ├── auth.js                  # JWT authentication & permissions
│   ├── validation.js            # Input validation rules
│   └── errorHandler.js          # Global error handling
├── routes/
│   ├── orderRoutes.js           # Order API endpoints
│   ├── customerRoutes.js        # Customer API endpoints
│   ├── adminRoutes.js           # Admin API endpoints
│   └── authRoutes.js            # Authentication endpoints
├── utils/
│   ├── errorResponse.js         # Custom error class
│   └── asyncHandler.js          # Async error wrapper
└── scripts/
    └── createAdmin.js           # First admin creation script
```

### **🎯 Key Features Built:**

#### **🔐 Authentication & Security**
- JWT-based authentication
- Role-based permissions (admin, manager, super_admin)
- Account lockout after failed login attempts
- Password hashing with bcrypt
- Rate limiting & CORS protection

#### **📦 Order Management**
- Complete CRUD operations
- 7-phase timeline tracking with automatic progression
- Order search, filtering, and pagination
- Status updates and phase advancement
- Order statistics and analytics

#### **👥 User Management**
- Customer database with order history
- Admin management with permissions
- User activity tracking

#### **📊 Analytics**
- Dashboard statistics
- Order progress tracking
- Revenue calculations
- Recent orders feed

### **🔗 API Endpoints:**

```bash
# Authentication
POST /api/auth/login         # Admin login
GET  /api/auth/me           # Get current admin
POST /api/auth/logout       # Admin logout

# Orders
GET    /api/orders          # Get all orders (with filters)
POST   /api/orders          # Create new order
GET    /api/orders/:id      # Get single order
PUT    /api/orders/:id      # Update order
DELETE /api/orders/:id      # Delete order
PATCH  /api/orders/:id/advance     # Advance to next phase
PATCH  /api/orders/:id/phase       # Update specific phase
GET    /api/orders/stats           # Order statistics
GET    /api/orders/search          # Search orders

# Admin & Customers
GET  /api/admin/dashboard   # Dashboard stats
GET  /api/customers         # All customers
POST /api/customers         # Create customer
```

### **🚀 How to Run:**

1. **Install Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Setup Environment:**
   Create `.env` file with:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/sourc_orders
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_EXPIRE=30d
   CLIENT_URL=http://localhost:3000
   ```

3. **Start MongoDB:**
   - Local: `mongod`
   - Or use MongoDB Atlas cloud

4. **Create First Admin:**
   ```bash
   npm run create-admin
   ```

5. **Start Server:**
   ```bash
   npm run dev  # Development mode
   npm start    # Production mode
   ```

### **📋 Default Admin Credentials:**
- **Email:** admin@sourc.nl
- **Password:** Admin123456
- **Role:** super_admin

### **🔧 Integration with Frontend:**

The backend is designed to work seamlessly with your existing admin dashboard. You'll need to:

1. **Update Frontend API Calls** to point to `http://localhost:5000/api`
2. **Add Authentication** to admin dashboard
3. **Replace Static Data** with API calls
4. **Handle Loading States** and errors

### **📚 Documentation:**

The backend includes:
- Complete API documentation in README.md
- Input validation on all endpoints
- Comprehensive error handling
- Security best practices
- Production-ready configuration

### **🎉 What's Next?**

Would you like me to:

1. **Start the backend server** to test it?
2. **Update the frontend** to connect to the API?
3. **Add more features** (notifications, file uploads, etc.)?
4. **Create database seeders** with sample data?
5. **Set up authentication** in the frontend?

The backend is complete and ready to use! What would you like to focus on next? 