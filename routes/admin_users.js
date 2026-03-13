const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const AuditService = require('../services/auditService');
const { verifyToken, checkRole, checkPermission } = require('../middleware/authMiddleware');

// Protect all admin routes
router.use(verifyToken, checkPermission('admin_users'));

// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, email, full_name, role, permissions, created_at FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: '無法獲取使用者列表' });
    }
});

// POST /api/admin/users - Create new user with permissions
router.post('/users', async (req, res) => {
    const { email, password, fullName, role, permissions } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash, full_name, role, permissions) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, fullName, role, JSON.stringify(permissions)]
        );

        const newUserId = result.insertId;
        await AuditService.recordAction(req, 'CREATE_USER', 'USER', newUserId, { email, fullName, role });

        res.status(201).json({ success: true, userId: newUserId });
    } catch (err) {
        console.error('[Admin] User creation error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: '此 Email 已被使用' });
        }
        res.status(500).json({ error: '建立使用者失敗: ' + err.message });
    }
});

// PATCH /api/admin/users/:id - Full account update
router.patch('/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Define allowed fields whitelist
        const allowedFields = {
            'fullName': 'full_name',
            'full_name': 'full_name',
            'email': 'email',
            'role': 'role',
            'permissions': 'permissions',
            'password': 'password_hash'
        };

        const updates = [];
        const values = [];

        // Validate and process each field
        for (const [key, value] of Object.entries(req.body)) {
            if (!allowedFields[key]) {
                return res.status(400).json({ error: `Invalid field: ${key}` });
            }

            const dbField = allowedFields[key];

            // Special handling for password
            if (key === 'password') {
                const hashedPassword = await bcrypt.hash(value, 10);
                updates.push(`${dbField} = ?`);
                values.push(hashedPassword);
            }
            // Special handling for permissions (JSON)
            else if (key === 'permissions') {
                updates.push(`${dbField} = ?`);
                values.push(JSON.stringify(value));
            }
            // Standard fields
            else {
                updates.push(`${dbField} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: '沒有提供更新欄位' });
        }

        values.push(id);
        const query = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;

        const [result] = await pool.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '找不到該使用者' });
        }

        await AuditService.recordAction(req, 'UPDATE_USER', 'USER', id, {
            updatedFields: Object.keys(req.body).filter(k => k !== 'password')
        });

        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] User update error:', err);
        res.status(500).json({
            error: '更新失敗',
            ...(process.env.NODE_ENV === 'development' && { details: err.message })
        });
    }
});

// DELETE /api/admin/users/:id - Delete user account
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Prevent self-deletion (safety check)
        if (req.user.id == id) {
            return res.status(400).json({ error: '不可刪除正在使用的帳號' });
        }

        // Check if target user is admin
        const [targetUser] = await pool.query('SELECT role, email FROM users WHERE id = ?', [id]);

        if (targetUser.length === 0) {
            return res.status(404).json({ error: '找不到該使用者' });
        }

        // Only super admin (cch) can delete admin accounts
        const isSuperAdmin = req.user.email === 'cch' || req.user.email === 'cch@cc-house.cc';

        if (targetUser[0].role === 'admin' && !isSuperAdmin) {
            return res.status(403).json({
                error: '權限不足：只有超級管理員可以刪除管理員帳號',
                message: '請聯繫超級管理員 (cch) 進行此操作'
            });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);

        await AuditService.recordAction(req, 'DELETE_USER', 'USER', id, { email: targetUser[0].email });

        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Delete user error:', err);
        res.status(500).json({ error: '刪除失敗' });
    }
});

module.exports = router;
