require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const setupDatabase = async () => {
    try {
        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ioe-cee-prep';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB successfully');

        // Create admin user
        const adminData = {
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            examType: 'ioe',
            isVerified: true
        };

        // Check if admin exists
        let admin = await User.findOne({ email: adminData.email });
        
        if (!admin) {
            console.log('Creating admin user...');
            admin = new User(adminData);
            await admin.save();
            console.log('Admin user created successfully');
        } else {
            console.log('Admin user already exists');
        }

        // Print admin credentials
        console.log('\nAdmin Credentials:');
        console.log('Email:', adminData.email);
        console.log('Password:', adminData.password);
        console.log('\nYou can now log in to the admin dashboard with these credentials.');

    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Database connection closed');
        process.exit(0);
    }
};

setupDatabase(); 