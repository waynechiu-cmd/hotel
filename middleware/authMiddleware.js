/**
 * Authentication Middleware
 * Validates user identity and enforces role-based access control.
 */

// Mock secret for development
const API_SECRET = process.env.API_SECRET || 'dev-secret-key';

const verifyToken = (req, res, next) => {
    // 1. Check for Corporate API Key
    const corpKey = req.headers['x-corp-key'];
    if (corpKey) {
        if (corpKey === process.env.CORPORATE_API_KEY || 'corp-123') {
            req.user = { id: 'corp', role: 'corporate' };
            return next();
        } else {
            return res.status(401).json({ error: 'Invalid Corporate API Key' });
        }
    }

    // 2. Check for Authorization Header (Mock implementation for Phase 2)
    // In production, use jsonwebtoken.verify()
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        // Allow public access for now unless route is protected
        // Or strictly require auth. For this demo, let's strictly require it on protected routes.
        // We will pass an empty user or handle it in specific routes.
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];
    if (token === 'dev-admin-token') {
        req.user = { id: 1, role: 'admin', email: 'admin@hotel.com' };
    } else if (token === 'dev-manager-token') {
        req.user = { id: 2, role: 'manager', email: 'manager@hotel.com' };
    } else if (token === 'dev-user-token') {
        req.user = { id: 3, role: 'user', email: 'user@hotel.com' };
    } else {
        return res.status(403).json({ error: 'Invalid Token' });
    }

    next();
};

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Access denied',
                message: `User role '${req.user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`
            });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    checkRole
};
