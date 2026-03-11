const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/rooms/projects - List all unique project names
router.get('/projects', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT DISTINCT project_name FROM rooms WHERE project_name IS NOT NULL AND project_name != ""');
        const projects = rows.map(r => r.project_name);
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET rooms by hotel ID or all rooms
router.get('/', async (req, res) => {
    try {
        const { hotelId, checkIn, checkOut, projectName } = req.query;

        let baseQuery = `
            SELECT r.*,
            (SELECT COUNT(*) FROM room_instances ri WHERE ri.room_type_id = r.id) as total_instances
            FROM rooms r WHERE 1=1
        `;
        const params = [];

        if (hotelId) {
            baseQuery += ' AND r.hotel_id = ?';
            params.push(hotelId);
        }

        if (projectName) {
            baseQuery += ' AND r.project_name = ?';
            params.push(projectName);
        }

        baseQuery += ' ORDER BY r.id ASC';

        const [rooms] = await pool.query(baseQuery, params);

        // Calculate Availability if dates are provided
        if (checkIn && checkOut) {
            const [bookings] = await pool.query(`
                SELECT room_type_id, COUNT(*) as booked_count
                FROM room_instances ri
                JOIN bookings b ON b.room_instance_id = ri.id
                WHERE b.status IN ('confirmed', 'pending')
                AND (
                    (b.check_in_date < ? AND b.check_out_date > ?)
                )
                GROUP BY room_type_id
            `, [checkOut, checkIn]);

            const bookedMap = {};
            bookings.forEach(b => bookedMap[b.room_type_id] = b.booked_count);

            // Filter and attach available count
            const availableRooms = rooms.map(room => {
                const total = room.total_instances || 0;
                const booked = bookedMap[room.id] || 0;
                const available = Math.max(0, total - booked);
                return { ...room, available_count: available };
            }).filter(room => room.available_count > 0);

            // Parse amenities
            availableRooms.forEach(room => {
                if (room.amenities && typeof room.amenities === 'string') {
                    try { room.amenities = JSON.parse(room.amenities); } catch (e) { }
                }
            });

            return res.json(availableRooms);
        }

        // Return all rooms if no dates (standard view)
        rooms.forEach(room => {
            if (room.amenities && typeof room.amenities === 'string') {
                try { room.amenities = JSON.parse(room.amenities); } catch (e) { }
            }
        });

        res.json(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// GET featured rooms
router.get('/featured', async (req, res) => {
    try {
        // Return random 3 rooms or first 3 as featured
        const [rooms] = await pool.query('SELECT * FROM rooms ORDER BY RAND() LIMIT 3');

        rooms.forEach(room => {
            if (room.amenities && typeof room.amenities === 'string') {
                try { room.amenities = JSON.parse(room.amenities); } catch (e) { }
            }
        });

        res.json(rooms);
    } catch (error) {
        console.error('Error fetching featured rooms:', error);
        res.status(500).json({ error: 'Failed to fetch featured rooms' });
    }
});

// GET single room by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [rooms] = await pool.query(
            'SELECT * FROM rooms WHERE id = ?',
            [id]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const room = rooms[0];

        if (room.amenities && typeof room.amenities === 'string') {
            room.amenities = JSON.parse(room.amenities);
        }

        // Get room images
        const [images] = await pool.query(
            'SELECT * FROM room_images WHERE room_id = ? ORDER BY display_order ASC',
            [id]
        );

        room.images = images;

        res.json(room);
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({ error: 'Failed to fetch room details' });
    }
});

// Check room availability and return specific instances
router.post('/:id/check-availability', async (req, res) => {
    try {
        const { id } = req.params;
        const { checkIn, checkOut, numRooms } = req.body;

        if (!checkIn || !checkOut || !numRooms) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get room info
        const [rooms] = await pool.query('SELECT * FROM rooms WHERE id = ?', [id]);
        if (rooms.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        const room = rooms[0];

        // Find available instances (Not booked in range)
        const [availableInstances] = await pool.query(`
            SELECT ri.* 
            FROM room_instances ri
            WHERE ri.room_type_id = ?
            AND ri.id NOT IN (
                SELECT room_instance_id 
                FROM bookings 
                WHERE status IN ('confirmed', 'pending')
                AND room_instance_id IS NOT NULL
                AND (
                    (check_in_date < ? AND check_out_date > ?)
                )
            )
        `, [id, checkOut, checkIn]);

        // Legacy check for total count if instances are not strictly used yet (fallback)
        // But since we are enforcing strict mode, we rely on availableInstances.

        res.json({
            available: availableInstances.length >= numRooms,
            availableRooms: availableInstances.length,
            requestedRooms: numRooms,
            instances: availableInstances // Return the actual units
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ error: 'Failed to check availability' });
    }
});

module.exports = router;
