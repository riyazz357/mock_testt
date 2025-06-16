const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function fixAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ioe-cee-prep');
        console.log('Connected to MongoDB');

        // Find admin user
        let admin = await User.findOne({ email: 'admin@ioeceeprep.com' });
        
        if (!admin) {
            console.log('Creating new admin user...');
            admin = new User({
                name: 'Admin User',
                email: 'admin@ioeceeprep.com',
                password: 'admin123',
                role: 'admin',
                examType: 'both'
            });
        } else {
            console.log('Updating existing admin user...');
            admin.role = 'admin';
        }

        await admin.save();
        console.log('Admin user verified/updated:');
        console.log({
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            examType: admin.examType
        });

        // Verify the user was saved correctly
        const verifiedAdmin = await User.findOne({ email: 'admin@ioeceeprep.com' });
        console.log('\nVerification - Admin user in database:');
        console.log({
            id: verifiedAdmin._id,
            name: verifiedAdmin.name,
            email: verifiedAdmin.email,
            role: verifiedAdmin.role,
            examType: verifiedAdmin.examType
        });

        process.exit(0);
    } catch (error) {
        console.error('Error fixing admin user:', error);
        process.exit(1);
    }
}

fixAdminUser(); 