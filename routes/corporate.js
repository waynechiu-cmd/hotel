const express = require('express');
const router = express.Router();
const database = require('../config/database');
const { verifyToken } = require('../middleware/authMiddleware');
const NotificationService = require('../services/notificationService');

// Middleware to verify corporate API key
router.use(verifyToken);

/**
 * @route POST /api/corporate/bookings
 * @desc Create a booking from corporate system
 * @access Corporate Only
 */
router.post('/bookings', async (req, res) => {
    // Only allow corporate user role
    if (!req.user || req.user.role !== 'corporate') {
        return res.status(403).json({ error: 'Access denied: Corporate credentials required' });
    }

    const {
        hotel_id,
        room_id,
        employee_id, // Extra field for tracking
        guest_name,
        guest_email,
        guest_phone,
        check_in_date,
        check_out_date,
        guests
    } = req.body;

    // Basic validation
    if (!hotel_id || !room_id || !guest_name || !check_in_date || !check_out_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await database.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get Room Details & Price
        const [rooms] = await connection.execute(
            'SELECT price_per_night FROM rooms WHERE id = ?',
            [room_id]
        );

        if (rooms.length === 0) {
            throw new Error('Room not found');
        }

        const pricePerNight = rooms[0].price_per_night;
        const nights = Math.ceil((new Date(check_out_date) - new Date(check_in_date)) / (1000 * 60 * 60 * 24));
        const totalPrice = pricePerNight * nights;

        // Generate Reference
        const bookingRef = `CORP-${employee_id || 'X'}-${Date.now().toString().slice(-6)}`;

        // 2. Create Booking
        const [result] = await connection.execute(
            `INSERT INTO bookings 
            (hotel_id, room_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, num_guests, total_price, status, booking_reference, special_requests)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
            [
                hotel_id,
                room_id,
                guest_name,
                guest_email,
                guest_phone,
                check_in_date,
                check_out_date,
                guests || 1,
                totalPrice,
                bookingRef,
                `Corporate Booking (Emp ID: ${employee_id})`
            ]
        );

        await connection.commit();

        const bookingData = {
            id: result.insertId,
            booking_reference: bookingRef,
            guest_name,
            guest_email,
            guest_phone,
            check_in_date,
            check_out_date,
            total_price: totalPrice
        };

        // 3. Send Notifications
        // Non-blocking notification
        NotificationService.sendBookingConfirmation(bookingData).catch(err => console.error(err));

        res.status(201).json({
            message: 'Corporate booking created successfully',
            data: bookingData
        });

    } catch (error) {
        await connection.rollback();
        console.error('Corporate Booking Error:', error);
        res.status(500).json({ error: 'Booking failed', details: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
