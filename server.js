const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');
require('dotenv').config();
console.log('DEBUG: Server JWT_SECRET:', process.env.JWT_SECRET);

const { testConnection } = require('./config/database');
const hotelsRouter = require('./routes/hotels');
const roomsRouter = require('./routes/rooms');
const bookingsRouter = require('./routes/bookings');
const corporateRouter = require('./routes/corporate');
const workOrdersRouter = require('./routes/workOrders');
const analyticsRouter = require('./routes/analytics');
const authRouter = require('./routes/auth');
const adminUsersRouter = require('./routes/admin_users');
const adminRoomsRouter = require('./routes/admin_rooms');
// const adminRouter = require('./routes/admin');
const inventoryRouter = require('./routes/inventory');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const PORT = process.env.PORT || 3000;

// Nonce generation middleware
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

// Security: Helmet middleware for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`, "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
            connectSrc: ["'self'", "http://104.199.235.223", "http://localhost:3000", "https://hotel.cc-house.cc", "https://cdn.jsdelivr.net"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            scriptSrcAttr: [(req, res) => `'nonce-${res.locals.nonce}'`], // Allow nonce for inline handlers
            upgradeInsecureRequests: null
        }
    },
    crossOriginEmbedderPolicy: false, // Disable to allow external resources
    hsts: process.env.NODE_ENV === 'production' // Enable HSTS in production
}));

// Security: Proper CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://104.199.235.223', 'http://localhost:3000', 'https://hotel.cc-house.cc'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (nginx proxy, mobile apps, Postman, curl, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Log rejected origins for debugging
        console.log(`[CORS] Rejected origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-corp-key']
}));

// Security: Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: '請求次數過多，請稍後再試' },
    standardHeaders: true,
    legacyHeaders: false
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased limit to allow testing and admin access
    message: { error: '此帳號登入嘗試次數過多，請15分鐘後再試' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    keyGenerator: (req) => {
        // Use username/email as the key instead of IP
        const username = req.body.username || req.body.email || 'unknown';
        return `login_${username}`;
    }
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Additional Security: Cache-Control for API routes
app.use((req, res, next) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/admin.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Apply rate limiting to API routes
// app.use('/api/', apiLimiter);

// API Routes
app.use('/api/hotels', hotelsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/corporate', corporateRouter); // New Corporate API
app.use('/api/work-orders', workOrdersRouter); // New Work Order System
app.use('/api/analytics', analyticsRouter); // BI & Analytics
// app.use('/api/auth/login', loginLimiter); // Apply stricter rate limit to login
app.use('/api/auth', authRouter); // Auth System
app.use('/api/admin', adminUsersRouter); // Admin Management
app.use('/api/admin', adminRoomsRouter); // Admin Room Management
// app.use('/api/admin', adminRouter); // Admin Utilities
app.use('/api/inventory', inventoryRouter); // Inventory Management

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

// Serve admin.ejs for admin path
app.get('/admin.html', (req, res) => {
    res.render('admin', { nonce: res.locals.nonce });
});


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    // Don't leak error details in production
    const isDev = process.env.NODE_ENV === 'development';

    res.status(err.status || 500).json({
        error: isDev ? err.message : 'Internal server error',
        ...(isDev && { stack: err.stack })
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Hotel Booking Platform server running on port ${PORT}`);
    console.log(`📍 Access the application at http://localhost:${PORT}`);
    testConnection();
});

// Graceful shutdown handling
const gracefulShutdown = () => {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
        console.log('Closed out remaining connections');
        process.exit(0);
    });

    // Force close server after 10 secs
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Periodic Inventory Alert Scheduler (Every 4 hours)
const INVENTORY_CHECK_INTERVAL = 4 * 60 * 60 * 1000;
const { pool: dbPool } = require('./config/database');
const NotifSvc = require('./services/notificationService');

async function checkInventoryAndAlert() {
    await NotifSvc.checkAllInventory();
}

// Run immediately on start then every 4 hours
setTimeout(checkInventoryAndAlert, 5000); // 5s delay after start
setInterval(checkInventoryAndAlert, INVENTORY_CHECK_INTERVAL);

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
