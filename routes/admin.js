const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Temporary endpoint to fix room images
router.post('/fix-room-images', async (req, res) => {
    try {
        const updates = [
            { id: 7, image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80' },
            { id: 8, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80' },
            { id: 9, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80' },
            { id: 10, image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80' }
        ];

        for (const room of updates) {
            await pool.query('UPDATE rooms SET main_image = ? WHERE id = ?', [room.image, room.id]);
        }

        const [rooms] = await pool.query('SELECT id, room_type, main_image FROM rooms');

        res.json({
            success: true,
            message: 'Room images updated successfully',
            rooms: rooms
        });
    } catch (error) {
        console.error('Error updating room images:', error);
        res.status(500).json({ error: 'Failed to update room images' });
    }
});

module.exports = router;
