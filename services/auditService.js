const { pool } = require('../config/database');

class AuditService {
    /**
     * Record an administrative action
     * @param {Object} req - Express request object (to get user and IP)
     * @param {String} action - Action name (e.g., 'CREATE_USER', 'UPDATE_ROOM')
     * @param {String} resourceType - Type of resource (e.g., 'USER', 'ROOM', 'INVENTORY')
     * @param {Number} resourceId - ID of the resource
     * @param {Object|String} details - Additional details about the action
     */
    static async recordAction(req, action, resourceType, resourceId, details) {
        try {
            const userId = req.user ? req.user.id : null;
            const userName = req.user ? (req.user.full_name || req.user.email) : 'System';
            const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

            const detailStr = typeof details === 'object' ? JSON.stringify(details) : details;

            await pool.query(`
                INSERT INTO audit_logs (user_id, user_name, action, resource_type, resource_id, details, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [userId, userName, action, resourceType, resourceId, detailStr, ipAddress]);

            console.log(`[Audit] Action recorded: ${action} on ${resourceType}:${resourceId} by ${userName}`);
        } catch (err) {
            console.error('[Audit] Failed to record action:', err);
        }
    }

    /**
     * Get audit logs with filters
     */
    static async getLogs(filters = {}) {
        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        const params = [];

        if (filters.action) {
            query += ' AND action = ?';
            params.push(filters.action);
        }

        if (filters.resourceType) {
            query += ' AND resource_type = ?';
            params.push(filters.resourceType);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(filters.limit || 100);

        const [rows] = await pool.query(query, params);
        return rows;
    }
}

module.exports = AuditService;
