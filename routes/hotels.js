const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET all hotels with optional search
router.get('/', async (req, res) => {
    try {
        const { city, minRating, maxPrice, search } = req.query;

        let query = `
            SELECT h.*, 
                   MIN(r.price_per_night) as min_price,
                   COUNT(DISTINCT r.id) as room_count
            FROM hotels h
            LEFT JOIN rooms r ON h.id = r.hotel_id
            WHERE 1=1
        `;
        const params = [];

        if (city) {
            query += ' AND h.city LIKE ?';
            params.push(`%${city}%`);
        }

        if (minRating) {
            query += ' AND h.rating >= ?';
            params.push(parseFloat(minRating));
        }

        if (search) {
            query += ' AND (h.name LIKE ? OR h.description LIKE ? OR h.city LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' GROUP BY h.id';

        if (maxPrice) {
            query += ' HAVING min_price <= ?';
            params.push(parseFloat(maxPrice));
        }

        query += ' ORDER BY h.rating DESC';

        const [hotels] = await pool.query(query, params);

        // Parse JSON fields
        hotels.forEach(hotel => {
            if (hotel.amenities && typeof hotel.amenities === 'string') {
                hotel.amenities = JSON.parse(hotel.amenities);
            }
        });

        res.json(hotels);
    } catch (error) {
        console.error('Error fetching hotels:', error);
        res.status(500).json({ error: 'Failed to fetch hotels' });
    }
});

// GET single hotel by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [hotels] = await pool.query(
            'SELECT * FROM hotels WHERE id = ?',
            [id]
        );

        if (hotels.length === 0) {
            return res.status(404).json({ error: 'Hotel not found' });
        }

        const hotel = hotels[0];

        // Parse JSON fields
        if (hotel.amenities && typeof hotel.amenities === 'string') {
            hotel.amenities = JSON.parse(hotel.amenities);
        }

        // Get rooms for this hotel
        const [rooms] = await pool.query(
            'SELECT * FROM rooms WHERE hotel_id = ? ORDER BY price_per_night ASC',
            [id]
        );

        rooms.forEach(room => {
            if (room.amenities && typeof room.amenities === 'string') {
                room.amenities = JSON.parse(room.amenities);
            }
        });

        hotel.rooms = rooms;

        res.json(hotel);
    } catch (error) {
        console.error('Error fetching hotel:', error);
        res.status(500).json({ error: 'Failed to fetch hotel details' });
    }
});

// GET featured hotels (top rated)
router.get('/featured/top', async (req, res) => {
    try {
        const [hotels] = await pool.query(`
            SELECT h.*, 
                   MIN(r.price_per_night) as min_price
            FROM hotels h
            LEFT JOIN rooms r ON h.id = r.hotel_id
            GROUP BY h.id
            ORDER BY h.rating DESC
            LIMIT 6
        `);

        hotels.forEach(hotel => {
            if (hotel.amenities && typeof hotel.amenities === 'string') {
                hotel.amenities = JSON.parse(hotel.amenities);
            }
        });

        res.json(hotels);
    } catch (error) {
        console.error('Error fetching featured hotels:', error);
        res.status(500).json({ error: 'Failed to fetch featured hotels' });
    }
});

module.exports = router;
