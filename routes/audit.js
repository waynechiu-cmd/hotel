const express = require('express');
const router = express.Router();
const AuditService = require('../services/auditService');
const { verifyToken, checkPermission } = require('../middleware/authMiddleware');

// Protect audit logs (Only Admin or users with explicit permission)
router.use(verifyToken, (req, res, next) => {
    if (req.user.role === 'admin') {
        return next();
    }
    const perms = req.user.permissions || [];
    if (perms.includes('admin_audit_logs')) {
        return next();
    }
    return res.status(403).json({ error: '權限不足', message: '需要管理員權限查看操作日誌' });
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await AuditService.getLogs({ limit });
        res.json(logs);
    } catch (err) {
        console.error('[AuditRoute] Error fetching logs:', err);
        res.status(500).json({ error: '無法獲取操作日誌' });
    }
});

module.exports = router;
