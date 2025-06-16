const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/emailService');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, examType } = req.body;
        console.log('Registration request received:', { name, email, examType });

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        // Create new user
        const user = new User({
            name,
            email,
            password,
            examType,
            verificationToken,
            verificationTokenExpires,
            isVerified: false
        });

        await user.save();
        console.log('User saved successfully:', user._id);

        // Send verification email
        const emailSent = await sendVerificationEmail(email, verificationToken);
        if (!emailSent) {
            console.error('Failed to send verification email to:', email);
            return res.status(500).json({ message: 'Error sending verification email' });
        }

        console.log('Verification email sent successfully to:', email);

        res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                examType: user.examType
            }
        });
    } catch (error) {
        console.error('Error in registration:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        console.log('Verifying email with token:', token);

        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        console.log('Email verified successfully for user:', user._id);

        // Generate token for automatic login
        const authToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ 
            message: 'Email verified successfully. You can now login.',
            token: authToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                examType: user.examType
            }
        });
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({ message: 'Error verifying email', error: error.message });
    }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('Resending verification email to:', email);

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Email already verified' });
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        user.verificationToken = verificationToken;
        user.verificationTokenExpires = verificationTokenExpires;
        await user.save();

        // Send verification email
        const emailSent = await sendVerificationEmail(email, verificationToken);
        if (!emailSent) {
            return res.status(500).json({ message: 'Error sending verification email' });
        }

        res.json({ message: 'Verification email sent successfully' });
    } catch (error) {
        console.error('Error resending verification email:', error);
        res.status(500).json({ message: 'Error resending verification email', error: error.message });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if email is verified
        if (!user.isVerified) {
            return res.status(401).json({ message: 'Please verify your email before logging in' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                examType: user.examType,
                preferences: user.preferences
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
});

// Update user preferences
router.put('/preferences', auth, async (req, res) => {
    try {
        const { theme, notifications } = req.body;
        
        req.user.preferences = {
            theme: theme || req.user.preferences.theme,
            notifications: notifications !== undefined ? notifications : req.user.preferences.notifications
        };

        await req.user.save();

        res.json({
            message: 'Preferences updated successfully',
            preferences: req.user.preferences
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating preferences', error: error.message });
    }
});

// Verify token
router.get('/verify', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        res.json({ 
            message: 'Token is valid',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

module.exports = router; 