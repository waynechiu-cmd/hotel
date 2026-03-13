const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const WorkOrderService = require('../services/workOrderService');

// Generate unique booking reference
function generateBookingReference() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let reference = '';
    for (let i = 0; i < 8; i++) {
        reference += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return reference;
}

// POST create new booking
router.post('/', async (req, res) => {
    try {
        const {
            roomId,
            hotelId,
            guestName,
            guestEmail,
            guestPhone,
            checkInDate,
            checkOutDate,
            numGuests,
            numRooms,
            specialRequests
        } = req.body;

        // Validate required fields
        if (!roomId || !hotelId || !guestName || !guestEmail || !guestPhone ||
            !checkInDate || !checkOutDate || !numGuests || !numRooms) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get room price
        const [rooms] = await pool.query('SELECT price_per_night FROM rooms WHERE id = ?', [roomId]);

        if (rooms.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Calculate total price
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const totalPrice = rooms[0].price_per_night * nights * numRooms;

        // Generate booking reference
        let bookingReference;
        let isUnique = false;

        while (!isUnique) {
            bookingReference = generateBookingReference();
            const [existing] = await pool.query(
                'SELECT id FROM bookings WHERE booking_reference = ?',
                [bookingReference]
            );
            isUnique = existing.length === 0;
        }

        // Insert booking
        const [result] = await pool.query(`
            INSERT INTO bookings (
                room_id, hotel_id, guest_name, guest_email, guest_phone,
                check_in_date, check_out_date, num_guests, num_rooms,
                total_price, special_requests, booking_reference, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
        `, [
            roomId, hotelId, guestName, guestEmail, guestPhone,
            checkInDate, checkOutDate, numGuests, numRooms,
            totalPrice, specialRequests || null, bookingReference
        ]);

        res.status(201).json({
            success: true,
            bookingId: result.insertId,
            bookingReference: bookingReference,
            totalPrice: totalPrice,
            nights: nights
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// GET booking by reference
router.get('/reference/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        const [bookings] = await pool.query(`
            SELECT b.*, h.name as hotel_name, h.address, h.city, h.phone as hotel_phone,
                   r.room_type, r.bed_type
            FROM bookings b
            JOIN hotels h ON b.hotel_id = h.id
            JOIN rooms r ON b.room_id = r.id
            WHERE b.booking_reference = ?
        `, [reference]);

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json(bookings[0]);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});

// GET booking by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [bookings] = await pool.query(`
            SELECT b.*, h.name as hotel_name, h.address, h.city, h.phone as hotel_phone,
                   r.room_type, r.bed_type, r.price_per_night
            FROM bookings b
            JOIN hotels h ON b.hotel_id = h.id
            JOIN rooms r ON b.room_id = r.id
            WHERE b.id = ?
        `, [id]);

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json(bookings[0]);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});

// GET all bookings (for admin)
router.get('/', async (req, res) => {
    try {
        const { status, email } = req.query;

        let query = `
            SELECT b.*, h.name as hotel_name, r.room_type
            FROM bookings b
            JOIN hotels h ON b.hotel_id = h.id
            JOIN rooms r ON b.room_id = r.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }

        if (email) {
            query += ' AND b.guest_email = ?';
            params.push(email);
        }

        query += ' ORDER BY b.created_at DESC';

        const [bookings] = await pool.query(query, params);
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// PUT update booking status
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        if (status === 'completed') {
            // Fetch booking details to get roomId
            const [booking] = await pool.query('SELECT room_id FROM bookings WHERE id = ?', [id]);
            if (booking.length > 0) {
                WorkOrderService.autoCreateCleaningTask(booking[0].room_id);
            }
        }

        await pool.query(
            'UPDATE bookings SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({ success: true, message: 'Booking updated successfully' });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

// DELETE cancel booking
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'UPDATE bookings SET status = ? WHERE id = ?',
            ['cancelled', id]
        );

        res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

module.exports = router;
