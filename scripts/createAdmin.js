const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const createFirstAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb+srv://sourc:sourc@sourc.pfjjjjd.mongodb.net/?retryWrites=true&w=majority&appName=sourc',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log('Connected to MongoDB');

    // Check if any admin exists
    const existingAdmin = await Admin.findOne();
    
    if (existingAdmin) {
      console.log('❌ Admin already exists!');
      console.log(`Existing admin: ${existingAdmin.email}`);
      process.exit(0);
    }

    // Create first super admin
    const adminData = {
      name: 'Super Admin',
      email: 'admin@sourc.nl',
      password: 'Admin123456',
      role: 'super_admin',
      profile: {
        firstName: 'Super',
        lastName: 'Admin',
        department: 'Management',
        position: 'System Administrator'
      },
      isActive: true,
      isVerified: true
    };

    const admin = await Admin.create(adminData);

    console.log('✅ First admin created successfully!');
    console.log('==========================================');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: Admin123456');
    console.log('👑 Role:', admin.role);
    console.log('==========================================');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('🔗 Login at: http://localhost:3000/admin');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

// Run the script
createFirstAdmin(); 