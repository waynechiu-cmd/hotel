const express = require('express');
const router = express.Router();
const WorkOrderService = require('../services/workOrderService');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Protect all work order routes
router.use(verifyToken);

// GET /api/work-orders - List all tickets (Staff/Admin)
router.get('/', async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            category: req.query.category,
            assignedTo: req.query.assignedTo
        };

        // If simple user (staff), maybe only show their assigned tasks?
        // For now, allow viewing all to foster collaboration.
        const orders = await WorkOrderService.getWorkOrders(filters);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch work orders' });
    }
});

// POST /api/work-orders - Create new ticket (Any auth user)
router.post('/', async (req, res) => {
    try {
        const { roomId, category, description, priority } = req.body;

        if (!category || !description) {
            return res.status(400).json({ error: 'Category and description are required' });
        }

        const ticketId = await WorkOrderService.createTicket({
            roomId,
            reportedBy: req.user.id || 1, // Fallback to admin if mock auth
            category,
            priority,
            description
        });

        res.status(201).json({
            message: 'Work order created',
            id: ticketId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create work order' });
    }
});

// PATCH /api/work-orders/:id - Update status (Staff/Admin)
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedTo } = req.body;

        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const success = await WorkOrderService.updateStatus(id, status, assignedTo);

        if (!success) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        res.json({ success: true, message: 'Work order updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update work order' });
    }
});

module.exports = router;
