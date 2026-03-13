const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Protect analytics (Admin only)
router.use(verifyToken, checkRole('admin'));

// GET /api/analytics/revenue - Monthly revenue data
router.get('/revenue', async (req, res) => {
    try {
        const query = `
            SELECT 
                h.name AS hotel_name,
                DATE_FORMAT(b.check_in_date, '%Y-%m') AS month,
                SUM(b.total_price) AS total_revenue,
                COUNT(*) AS total_bookings
            FROM bookings b
            JOIN hotels h ON b.hotel_id = h.id
            WHERE b.status = 'completed'
            GROUP BY h.name, month
            ORDER BY month DESC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch revenue stats' });
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
            LEFT JOIN bookings b ON r.id = b.room_id AND b.status != 'cancelled'
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
            WHERE w.status = 'resolved'
            GROUP BY u.full_name, w.category
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch performance stats' });
    }
});

module.exports = router;
