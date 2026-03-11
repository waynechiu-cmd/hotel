const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET is missing in middleware!');
}

const verifyToken = (req, res, next) => {
    // 1. Check Cookie
    if (req.cookies && req.cookies.token) {
        try {
            const decoded = jwt.verify(req.cookies.token, JWT_SECRET);
            req.user = decoded;
            return next();
        } catch (err) {
            // Invalid cookie token, proceed to check header
        }
    }

    // 2. JWT Verification
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const fs = require('fs');
        const logPath = '/home/wayne.chiu/auth_debug.log';
        const log = (msg) => {
            try { fs.appendFileSync(logPath, msg + '\n'); } catch (e) {
                console.error('[AuthMiddleware] Log write failed:', e);
            }
            console.log(msg);
        };

        log(`[AuthDebug-V2] Verifying token: ${token.substring(0, 20)}...`);
        log(`[AuthDebug-V2] Secret Length: ${JWT_SECRET.length}`);

        // Log hex carefully
        const hex = Buffer.from(JWT_SECRET.substring(0, 5)).toString('hex');
        log(`[AuthDebug-V2] Secret Start (Hex): ${hex}`);

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        const fs = require('fs');
        const logPath = '/home/wayne.chiu/auth_debug.log';
        let errorMsg = err.message;
        if (err.name === 'TokenExpiredError') errorMsg = 'Token Expired';
        if (err.name === 'JsonWebTokenError') errorMsg = 'Invalid Signature/Token';

        try { fs.appendFileSync(logPath, `[AuthDebug-V2] Token verification failed: ${errorMsg}\n`); } catch (e) { }
        console.error(`[AuthDebug-V2] Console: Token verification failed for ${token.substring(0, 10)}: ${errorMsg}`);
        return res.status(403).json({ error: '無效或過期的憑證', details: errorMsg })
    }
};

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: '請先登入' });
        }
        if (req.user.email === 'cch' || req.user.email === 'cch@cc-house.cc') {
            return next();
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: '權限不足',
                message: `您的角色 '${req.user.role}' 無法存取此功能。`
            });
        }
        next();
    };
};

const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: '請先登入' });
        if (req.user.role === 'admin') return next();
        const permissions = req.user.permissions || [];
        if (!permissions.includes(requiredPermission)) {
            return res.status(403).json({ error: '權限不足', permission: requiredPermission });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    checkRole,
    checkPermission
};
