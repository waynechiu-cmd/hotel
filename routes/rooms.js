const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET rooms by hotel ID or all rooms
router.get('/', async (req, res) => {
    try {
        const { hotelId, minPrice, maxPrice } = req.query;

        let query = 'SELECT * FROM rooms WHERE 1=1';
        const params = [];

        if (hotelId) {
            query += ' AND hotel_id = ?';
            params.push(hotelId);
        }

        if (minPrice) {
            query += ' AND price_per_night >= ?';
            params.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            query += ' AND price_per_night <= ?';
            params.push(parseFloat(maxPrice));
        }

        query += ' ORDER BY price_per_night ASC';

        const [rooms] = await pool.query(query, params);

        rooms.forEach(room => {
            if (room.amenities && typeof room.amenities === 'string') {
                room.amenities = JSON.parse(room.amenities);
            }
        });

        res.json(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Failed to fetch rooms' });
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

// Check room availability
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

        // Check existing bookings for the date range
        const [bookings] = await pool.query(`
            SELECT SUM(num_rooms) as booked_rooms
            FROM bookings
            WHERE room_id = ?
            AND status IN ('pending', 'confirmed')
            AND (
                (check_in_date <= ? AND check_out_date > ?) OR
                (check_in_date < ? AND check_out_date >= ?) OR
                (check_in_date >= ? AND check_out_date <= ?)
            )
        `, [id, checkOut, checkIn, checkOut, checkOut, checkIn, checkOut]);

        const bookedRooms = bookings[0].booked_rooms || 0;
        const availableRooms = room.total_rooms - bookedRooms;

        res.json({
            available: availableRooms >= numRooms,
            availableRooms: availableRooms,
            requestedRooms: numRooms
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ error: 'Failed to check availability' });
    }
});

module.exports = router;
