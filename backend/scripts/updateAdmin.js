const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function updateAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ioe-cee-prep');
        console.log('Connected to MongoDB');

        // Update admin user
        const admin = await User.findOneAndUpdate(
            { email: 'admin@ioeceeprep.com' },
            { role: 'admin' },
            { new: true }
        );
        
        if (admin) {
            console.log('Admin user updated:');
            console.log({
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                examType: admin.examType
            });
        } else {
            console.log('Admin user not found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error updating admin user:', error);
        process.exit(1);
    }
}

updateAdminUser(); 