const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const WorkOrderService = require('../services/workOrderService');
const NotificationService = require('../services/notificationService');
const { verifyToken, checkPermission } = require('../middleware/authMiddleware');

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
            guestName,
            guestEmail,
            guestPhone,
            guestMobile, // NEW
            checkInDate,
            checkOutDate,
            numGuests,
            numRooms,
            specialRequests,
            roomInstanceId,
            projectCategory
        } = req.body;

        // Validate required fields
        if (!roomId || !guestName || !guestEmail || !guestPhone || !guestMobile ||
            !checkInDate || !checkOutDate || !numGuests || !numRooms || !roomInstanceId) {
            return res.status(400).json({ error: 'Missing required fields (Name, Phone, Mobile, Email are required)' });
        }

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        // Strict Availability Check
        const [conflicts] = await pool.query(`
            SELECT id FROM bookings 
            WHERE room_instance_id = ? 
            AND status IN ('confirmed', 'pending')
            AND (
                (check_in_date < ? AND check_out_date > ?)
            )
        `, [roomInstanceId, checkOut, checkIn]);

        if (conflicts.length > 0) {
            return res.status(409).json({ error: '此房號已無空房 (No Vacancy for this unit)' });
        }

        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

        // Generate booking reference
        let bookingReference;
        let isUnique = false;
        while (!isUnique) {
            bookingReference = generateBookingReference();
            const [existing] = await pool.query('SELECT id FROM bookings WHERE booking_reference = ?', [bookingReference]);
            isUnique = existing.length === 0;
        }

        // Create booking in database
        const [[roomInfo]] = await pool.query('SELECT project_name FROM rooms WHERE id = ?', [roomId]);
        const finalProjectCategory = projectCategory || (roomInfo ? roomInfo.project_name : '一般');

        const [result] = await pool.query(`
            INSERT INTO bookings (
                room_id, guest_name, guest_email, guest_phone, guest_mobile,
                check_in_date, check_out_date, num_guests, num_rooms,
                special_requests, booking_reference, status, room_instance_id, total_price,
                project_category
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `, [
            roomId, guestName, guestEmail, guestPhone, guestMobile,
            checkInDate, checkOutDate, numGuests, numRooms,
            specialRequests || null, bookingReference, 'confirmed', roomInstanceId,
            finalProjectCategory
        ]);

        // Fetch full booking details for email
        const [bookingDetails] = await pool.query(`
            SELECT b.*, r.room_type, r.main_image, ri.room_number
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            LEFT JOIN room_instances ri ON b.room_instance_id = ri.id
            WHERE b.id = ?
        `, [result.insertId]);

        if (bookingDetails.length > 0) {
            // Send confirmation email
            NotificationService.sendBookingConfirmation(bookingDetails[0]);
        }

        res.status(201).json({
            success: true,
            bookingId: result.insertId,
            bookingReference: bookingReference,
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
            SELECT b.*, r.room_type, r.bed_type
            FROM bookings b
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

// GET booking by ID (Admin only for now, or could check owner)
router.get('/:id', verifyToken, checkPermission('admin_bookings'), async (req, res) => {
    try {
        const { id } = req.params;

        const [bookings] = await pool.query(`
            SELECT b.*, r.room_type, r.bed_type
            FROM bookings b
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
router.get('/', verifyToken, checkPermission('admin_bookings'), async (req, res) => {
    try {
        const { status, email, projectCategory } = req.query;

        let query = `
            SELECT b.*, r.room_type, ri.room_number
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            LEFT JOIN room_instances ri ON b.room_instance_id = ri.id
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

        if (projectCategory) {
            query += ' AND b.project_category = ?';
            params.push(projectCategory);
        }

        query += ' ORDER BY b.created_at DESC';

        const [bookings] = await pool.query(query, params);
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// PUT update booking
router.put('/:id', verifyToken, checkPermission('admin_bookings'), async (req, res) => {
    try {
        const { id } = req.params;

        // Define allowed fields whitelist
        const allowedFields = {
            'status': (val) => ['pending', 'confirmed', 'cancelled', 'completed'].includes(val),
            'guestName': (val) => typeof val === 'string' && val.length > 0,
            'guestEmail': (val) => typeof val === 'string' && val.includes('@'),
            'guestPhone': (val) => typeof val === 'string',
            'guestMobile': (val) => typeof val === 'string',
            'checkInDate': (val) => !isNaN(new Date(val).getTime()),
            'checkOutDate': (val) => !isNaN(new Date(val).getTime()),
            'checkOutDate': (val) => !isNaN(new Date(val).getTime()),
            'roomInstanceId': (val) => Number.isInteger(parseInt(val)),
            'specialRequests': (val) => true, // Optional string
            'projectCategory': (val) => typeof val === 'string'
        };

        // Map camelCase to snake_case
        const fieldMapping = {
            'guestName': 'guest_name',
            'guestEmail': 'guest_email',
            'guestPhone': 'guest_phone',
            'guestMobile': 'guest_mobile',
            'checkInDate': 'check_in_date',
            'checkOutDate': 'check_out_date',
            'checkOutDate': 'check_out_date',
            'roomInstanceId': 'room_instance_id',
            'status': 'status',
            'specialRequests': 'special_requests',
            'projectCategory': 'project_category'
        };

        const updates = [];
        const values = [];

        // Validate and build update query
        for (const [key, value] of Object.entries(req.body)) {
            if (!allowedFields[key]) {
                return res.status(400).json({ error: `Invalid field: ${key}` });
            }

            if (!allowedFields[key](value)) {
                return res.status(400).json({ error: `Invalid value for field: ${key}` });
            }

            const dbField = fieldMapping[key];
            updates.push(`${dbField} = ?`);

            // Convert dates if necessary
            if (key === 'checkInDate' || key === 'checkOutDate') {
                values.push(new Date(value));
            } else {
                values.push(value);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.query(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`, values);

        if (req.body.status === 'completed') {
            // Fetch booking details to get roomId
            const [booking] = await pool.query('SELECT room_id FROM bookings WHERE id = ?', [id]);
            if (booking.length > 0) {
                WorkOrderService.autoCreateCleaningTask(booking[0].room_id);
            }
        }

        // Send email notification when confirmed
        if (req.body.status === 'confirmed') {
            const [bookingResults] = await pool.query(`
                SELECT b.*, r.room_type, r.main_image, ri.room_number
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                LEFT JOIN room_instances ri ON b.room_instance_id = ri.id
                WHERE b.id = ?
            `, [id]);

            if (bookingResults.length > 0) {
                NotificationService.sendBookingConfirmation(bookingResults[0]);
            }
        }

        res.json({ success: true, message: 'Booking updated successfully' });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

// DELETE cancel booking
router.delete('/:id', verifyToken, checkPermission('admin_bookings'), async (req, res) => {
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
