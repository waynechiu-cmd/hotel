const express = require('express');
const router = express.Router();
const WorkOrderService = require('../services/workOrderService');
const AuditService = require('../services/auditService');
const { verifyToken, checkRole, checkPermission } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for work order photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/work-orders/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'wo-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Protect all work order routes
router.use(verifyToken);

// GET /api/work-orders - List tickets (Staff/Admin)
router.get('/', verifyToken, (req, res, next) => {
    // Allow if has either permission
    const perms = req.user.permissions || [];
    if (req.user.role === 'admin' || perms.includes('staff_pwa') || perms.includes('admin_work_orders')) {
        return next();
    }
    return res.status(403).json({ error: '權限不足', message: '需要房務或派工權限' });
}, async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            category: req.query.category,
            // Staff can only see their own assigned tickets
            assignedTo: req.user.role === 'admin' ? req.query.assignedTo : req.user.id
        };

        // Special handling for 'open' status (pending or in_progress)
        if (filters.status === 'open') {
            delete filters.status;
            filters.is_open = true;
        }

        const orders = await WorkOrderService.getWorkOrders(filters);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch work orders' });
    }
});

// POST /api/work-orders - Create new ticket
router.post('/', verifyToken, checkPermission('admin_work_orders'), async (req, res) => {
    try {
        const { roomId, category, description, priority, assignedTo } = req.body;

        if (!category || !description) {
            return res.status(400).json({ error: 'Category and description are required' });
        }

        const ticketId = await WorkOrderService.createTicket({
            roomId,
            reportedBy: req.user.id || 1, // Fallback to admin if mock auth
            category,
            priority,
            description,
            assignedTo
        });

        // Log to general audit
        await AuditService.recordAction(req, 'CREATE_WORK_ORDER', 'WORK_ORDER', ticketId, { category, priority, description });

        // Trigger Notification if assigned
        if (assignedTo) {
            try {
                const NotificationService = require('../services/notificationService');
                const { pool } = require('../config/database');

                // Fetch staff info
                const [users] = await pool.query('SELECT email, full_name FROM users WHERE id = ?', [assignedTo]);
                if (users.length > 0) {
                    const staff = users[0];
                    // Fetch physical room number if provided
                    let roomNumber = '公共區域';
                    if (roomId) {
                        const [rooms] = await pool.query('SELECT room_number FROM room_instances WHERE id = ?', [roomId]);
                        if (rooms.length > 0) roomNumber = rooms[0].room_number;
                    }

                    await NotificationService.sendWorkOrderNotification({
                        id: ticketId,
                        category,
                        priority,
                        description,
                        roomNumber
                    }, staff.email, staff.full_name);
                }
            } catch (notifyErr) {
                console.error('[WorkOrder] Notification failed:', notifyErr);
            }
        }

        res.status(201).json({
            message: 'Work order created',
            id: ticketId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create work order' });
    }
});

// PATCH /api/work-orders/:id - Update status (handles optional image upload)
router.patch('/:id', verifyToken, (req, res, next) => {
    const perms = req.user.permissions || [];
    if (req.user.role === 'admin' || perms.includes('staff_pwa') || perms.includes('admin_work_orders')) {
        return next();
    }
    return res.status(403).json({ error: '權限不足' });
}, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedTo, roomId, description, priority, staffRemarks } = req.body;
        let photoUrl = undefined;

        if (req.file) {
            photoUrl = `/uploads/work-orders/${req.file.filename}`;
        }

        const validStatuses = ['pending', 'in_progress', 'completed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const success = await WorkOrderService.updateStatus(id, status, assignedTo, roomId, description, priority, photoUrl, staffRemarks, req.user.id);

        if (success) {
            // Log to general audit
            await AuditService.recordAction(req, 'UPDATE_WORK_ORDER', 'WORK_ORDER', id, { status, assignedTo, priority });
        }

        if (!success) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        res.json({
            success: true,
            message: 'Work order updated',
            photoUrl: photoUrl
        });
    } catch (error) {
        console.error('[WorkOrder] Update error:', error);
        res.status(500).json({ error: 'Failed to update work order' });
    }
});

module.exports = router;
