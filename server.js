const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const hotelsRouter = require('./routes/hotels');
const roomsRouter = require('./routes/rooms');
const bookingsRouter = require('./routes/bookings');
const corporateRouter = require('./routes/corporate');
const workOrdersRouter = require('./routes/workOrders');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Helmet security middleware with relaxed CSP for dynamic styles
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // 關鍵修改：加入 'unsafe-inline' 讓動態樣式（如進度條）生效
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`, "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
            connectSrc: ["'self'", "http://104.199.235.223", "http://localhost:3000", "https://hotel.cc-house.cc"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: null
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === 'production'
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/hotels', hotelsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/corporate', corporateRouter); // New Corporate API
app.use('/api/work-orders', workOrdersRouter); // New Work Order System
app.use('/api/analytics', analyticsRouter); // BI & Analytics

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.json({
        status: 'ok',
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Hotel Booking Platform server running on port ${PORT}`);
    console.log(`📍 Access the application at http://localhost:${PORT}`);
    testConnection();
});

module.exports = app;
