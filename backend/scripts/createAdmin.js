require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ioe-cee-prep');
        console.log('Connected to MongoDB');

        const adminData = {
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'admin123', // This will be hashed by the User model
            role: 'admin',
            examType: 'ioe', // Required field
            isVerified: true // Admin is pre-verified
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Create admin user
        const admin = new User(adminData);
        await admin.save();
        console.log('Admin user created successfully');
        console.log('Email:', adminData.email);
        console.log('Password:', adminData.password);

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

createAdmin(); 