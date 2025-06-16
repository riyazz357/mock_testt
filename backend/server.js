const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors({
    origin: '*', // Allow all origins during development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add detailed request logging middleware
app.use((req, res, next) => {
    console.log('\n=== New Request ===');
    console.log('Time:', new Date().toISOString());
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/test', (req, res) => {
    res.send('Server is working!');
});

// Add a specific route for login.html
app.get('/login.html', (req, res) => {
    console.log('Serving login.html');
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Add a specific route for admin.html
app.get('/admin.html', (req, res) => {
    console.log('Serving admin.html');
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// Serve static files from frontend directory (this should be last)
app.use(express.static(path.join(__dirname, '../frontend')));

// Import routes
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/question');
const testRoutes = require('./routes/test');
const testResultRoutes = require('./routes/testResult');
const studyMaterialRoutes = require('./routes/studyMaterials');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/results', testResultRoutes);
app.use('/api/study-materials', studyMaterialRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
    });
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// MongoDB connection options
const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
};

// Function to connect to MongoDB with retries
const connectWithRetry = async () => {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            console.log(`Attempting to connect to MongoDB (attempt ${retries + 1}/${maxRetries})...`);
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ioe-cee-prep', mongooseOptions);
            console.log('Successfully connected to MongoDB!');
            console.log('Database name:', mongoose.connection.name);
            console.log('Host:', mongoose.connection.host);
            console.log('Port:', mongoose.connection.port);
            return true;
        } catch (error) {
            retries++;
            console.error(`MongoDB connection attempt ${retries} failed:`, error.message);
            if (retries === maxRetries) {
                console.error('Max retries reached. Could not connect to MongoDB.');
                return false;
            }
            // Wait for 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    return false;
};

// Function to start the server
const startServer = async () => {
    try {
        // Try to connect to MongoDB
        const dbConnected = await connectWithRetry();
        
        if (!dbConnected) {
            console.warn('Starting server without database connection...');
            console.warn('Some features may not work properly.');
        }

        // Start the server with fallback ports
        const ports = [5000, 5001, 5002, 5003, 5004];
        let server = null;
        let lastError = null;

        for (const port of ports) {
            try {
                console.log(`Attempting to start server on port ${port}...`);
                server = app.listen(port, '127.0.0.1', () => {
                    console.log(`Server is running on http://127.0.0.1:${port}`);
                    console.log('Environment:', process.env.NODE_ENV || 'development');
                    console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/ioe-cee-prep');
                });
                break; // If we successfully start the server, break the loop
            } catch (error) {
                lastError = error;
                console.error(`Failed to start server on port ${port}:`, error.message);
                if (error.code === 'EADDRINUSE') {
                    console.log(`Port ${port} is in use, trying next port...`);
                    continue;
                }
                throw error;
            }
        }

        if (!server) {
            console.error('All ports are in use. Last error:', lastError);
            throw new Error('Could not find an available port to start the server');
        }

        // Handle server errors
        server.on('error', (error) => {
            console.error('Server error:', error);
            if (error.code === 'EADDRINUSE') {
                console.error(`Port is already in use. Please try a different port.`);
                process.exit(1);
            }
        });

        // Handle process termination
        process.on('SIGTERM', () => {
            console.log('SIGTERM received. Shutting down gracefully...');
            server.close(() => {
                console.log('Server closed');
                mongoose.connection.close(false, () => {
                    console.log('MongoDB connection closed');
                    process.exit(0);
                });
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer(); 