const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const AuditService = require('../services/auditService');
const { verifyToken, checkPermission } = require('../middleware/authMiddleware');
const NotificationService = require('../services/notificationService');

// GET /api/inventory - List all items
router.get('/', verifyToken, checkPermission('admin_inventory'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// POST /api/inventory - Add new item (Admin only)
router.post('/', verifyToken, checkPermission('admin_inventory'), async (req, res) => {
    const { name, code, quantity, alertThreshold } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and Code are required' });

    try {
        const [result] = await pool.query(
            'INSERT INTO inventory (name, code, quantity, alert_threshold) VALUES (?, ?, ?, ?)',
            [name, code, quantity || 0, alertThreshold || 5]
        );

        const newId = result.insertId;
        await AuditService.recordAction(req, 'CREATE_INVENTORY', 'INVENTORY', newId, { name, code, quantity });

        res.status(201).json({ id: newId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Item code already exists' });
        res.status(500).json({ error: 'Failed to add item' });
    }
});

// PATCH /api/inventory/:id - Update stock or threshold
router.patch('/:id', verifyToken, checkPermission('admin_inventory'), async (req, res) => {
    const { quantity, alertThreshold } = req.body;
    const { id } = req.params;

    try {
        let updateQuery = 'UPDATE inventory SET ';
        const params = [];
        if (quantity !== undefined) {
            updateQuery += 'quantity = ?, ';
            params.push(quantity);
        }
        if (alertThreshold !== undefined) {
            updateQuery += 'alert_threshold = ?, ';
            params.push(alertThreshold);
        }
        updateQuery = updateQuery.slice(0, -2) + ' WHERE id = ?';
        params.push(id);

        await pool.query(updateQuery, params);
        console.log(`[Inventory] Item ${id} updated successfully:`, { quantity, alertThreshold });

        await AuditService.recordAction(req, 'UPDATE_INVENTORY', 'INVENTORY', id, { quantity, alertThreshold });

        // Check for low stock immediately
        try {
            await NotificationService.checkInventoryItem(id);
        } catch (notifErr) {
            console.error('[Inventory] Notification check failed (Non-blocking):', notifErr);
        }

        res.json({ success: true });
    } catch (err) {
        console.error(`[Inventory] Failed to update item ${id}:`, err);
        res.status(500).json({
            error: 'Failed to update item',
            details: err.message
        });
    }
});

// DELETE /api/inventory/:id - Remove item
router.delete('/:id', verifyToken, checkPermission('admin_inventory'), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM inventory WHERE id = ?', [id]);

        await AuditService.recordAction(req, 'DELETE_INVENTORY', 'INVENTORY', id);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

module.exports = router;
