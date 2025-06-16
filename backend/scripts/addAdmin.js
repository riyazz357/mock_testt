const mongoose = require('mongoose');
const User = require('../models/User');

async function addAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/ioe-cee-prep');
        console.log('Connected to MongoDB');

        // Create admin user
        const adminUser = new User({
            name: 'Admin',
            email: 'admin@admin.com',
            password: 'admin123',
            role: 'admin',
            examType: 'ioe',
            isVerified: true
        });

        // Save admin user
        await adminUser.save();
        console.log('Admin user created successfully!');
        console.log('Email: admin@admin.com');
        console.log('Password: admin123');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

addAdmin(); 