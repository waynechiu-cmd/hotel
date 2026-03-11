const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken, checkPermission } = require('../middleware/authMiddleware');

// Protect analytics (Admin or bi_dashboard permission)
router.use(verifyToken, (req, res, next) => {
    const perms = req.user.permissions || [];
    if (req.user.role === 'admin' || perms.includes('bi_dashboard')) {
        return next();
    }
    return res.status(403).json({ error: '權限不足', message: '需要 BI 儀表板權限' });
});

// GET /api/analytics/revenue - Monthly booking count (Revenue removed)
router.get('/revenue', async (req, res) => {
    try {
        const query = `
            SELECT 
                h.name AS hotel_name,
                DATE_FORMAT(b.check_in_date, '%Y-%m') AS month,
                COUNT(*) AS total_bookings
            FROM bookings b
            JOIN room_instances ri ON b.room_instance_id = ri.id
            JOIN hotels h ON ri.hotel_id = h.id
            WHERE b.status = 'completed'
            GROUP BY h.name, month
            ORDER BY month DESC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch booking stats' });
    }
});

// GET /api/analytics/occupancy - Occupancy stats
router.get('/occupancy', async (req, res) => {
    try {
        const query = `
            SELECT 
                h.name AS hotel_name,
                r.room_type,
                COUNT(b.id) AS bookings_count,
                AVG(DATEDIFF(b.check_out_date, b.check_in_date)) AS avg_stay_duration
            FROM rooms r
            JOIN hotels h ON r.hotel_id = h.id
            LEFT JOIN room_instances ri ON r.id = ri.room_type_id
            LEFT JOIN bookings b ON ri.id = b.room_instance_id AND b.status != 'cancelled'
            GROUP BY h.name, r.room_type
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch occupancy stats' });
    }
});

// GET /api/analytics/performance - Staff performance
router.get('/performance', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.full_name AS staff_name,
                w.category,
                COUNT(*) AS tasks_completed,
                AVG(TIMESTAMPDIFF(HOUR, w.created_at, w.resolved_at)) AS avg_resolution_hours
            FROM work_orders w
            JOIN users u ON w.assigned_to = u.id
            WHERE w.status = 'completed'
            GROUP BY u.full_name, w.category
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch performance stats' });
    }
});

// GET /api/analytics/summary - Aggregate metrics for dashboard
router.get('/summary', async (req, res) => {
    try {
        // 1. Occupancy Rate
        const [totalRooms] = await pool.query('SELECT COUNT(*) as count FROM room_instances');
        const [occupiedRooms] = await pool.query(`
            SELECT COUNT(*) as count FROM bookings 
            WHERE CURDATE() BETWEEN check_in_date AND DATE_SUB(check_out_date, INTERVAL 1 DAY) 
            AND status != 'cancelled'
        `);

        const occupancyRate = totalRooms[0].count > 0
            ? Math.round((occupiedRooms[0].count / totalRooms[0].count) * 100)
            : 0;

        // 2. Work Order Completion Rate
        const [totalWO] = await pool.query('SELECT COUNT(*) as count FROM work_orders');
        const [resolvedWO] = await pool.query('SELECT COUNT(*) as count FROM work_orders WHERE status = "completed"');

        const woCompletionRate = totalWO[0].count > 0
            ? Math.round((resolvedWO[0].count / totalWO[0].count) * 100)
            : 0;

        // 3. Inventory Status (approaching alert)
        const [inventoryItems] = await pool.query(`
            SELECT *, 
                CASE 
                    WHEN quantity <= alert_threshold THEN "alert"
                    WHEN quantity <= alert_threshold + 5 THEN "warning"
                    ELSE "ok"
                END as status
            FROM inventory
            WHERE quantity <= alert_threshold + 5
        `);

        res.json({
            occupancyRate,
            occupiedCount: occupiedRooms[0].count,
            totalRooms: totalRooms[0].count,
            woCompletionRate,
            totalWorkOrders: totalWO[0].count,
            resolvedWorkOrders: resolvedWO[0].count,
            inventoryAlerts: inventoryItems
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch summary stats' });
    }
});

module.exports = router;
