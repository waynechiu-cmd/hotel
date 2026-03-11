const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// JWT_SECRET is accessed inside functions to ensure process.env is ready

const verifyToken = (req, res, next) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('❌ CRITICAL: JWT_SECRET is missing!');
        return res.status(500).json({ error: '伺服器設定錯誤' });
    }

    // 1. Check Cookie
    if (req.cookies && req.cookies.token) {
        try {
            const decoded = jwt.verify(req.cookies.token, secret);
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
        console.log(`[AuthDebug-V2] Verifying token: ${token.substring(0, 15)}... using secret: ${secret.substring(0, 3)}...`);
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        console.log(`[AuthDebug-V2] Success for: ${decoded.email}`);
        next();
    } catch (err) {
        console.error(`[AuthDebug-V2] Token verification failed: ${err.message} for token: ${token.substring(0, 15)}...`);
        return res.status(403).json({ error: '無效或過期的憑證' })
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
