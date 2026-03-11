const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const AuditService = require('../services/auditService');
const { verifyToken, checkRole, checkPermission } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/rooms/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'room-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
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

// Protect all admin routes
router.use(verifyToken, checkPermission('admin_rooms'));

// GET /api/admin/room-types - List all room types with their counts
router.get('/room-types', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT r.*, h.name as hotel_name,
            (SELECT COUNT(*) FROM room_instances ri WHERE ri.room_type_id = r.id) as instance_count
            FROM rooms r
            JOIN hotels h ON r.hotel_id = h.id
            ORDER BY r.id DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('[Admin] Failed to fetch room types:', err);
        res.status(500).json({ error: '無法獲取房型列表' });
    }
});

// POST /api/admin/room-types - Create new room type
router.post('/room-types', async (req, res) => {
    try {
        const { room_type, hotel_id, layout, description, main_image, bed_type, max_occupancy, size_sqm, project_name } = req.body;

        if (!room_type || !hotel_id) {
            return res.status(400).json({ error: '房型名稱與飯店ID為必填' });
        }

        const [result] = await pool.query(
            `INSERT INTO rooms (room_type, hotel_id, layout, description, main_image, bed_type, max_occupancy, size_sqm, project_name, amenities) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [room_type, hotel_id, layout || '', description || '', main_image || '', bed_type || '', max_occupancy || 1, size_sqm || 0, project_name || '一般', '[]']
        );

        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('[Admin] Failed to create room type:', err);
        res.status(500).json({ error: '建立房型失敗', details: err.message });
    }
});

// PATCH /api/admin/room-types/:id - Update room type
router.patch('/room-types/:id', async (req, res) => {
    const { id } = req.params;

    try {
        console.log(`[AdminRooms] PATCH /room-types/${id} called`);
        console.log(`[AdminRooms] Request Body:`, JSON.stringify(req.body));

        const allowedFields = [
            'room_type', 'layout', 'description', 'main_image',
            'bed_type', 'max_occupancy', 'size_sqm', 'amenities', 'project_name'
        ];

        const updates = [];
        const values = [];

        // Dynamic update builder
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (field === 'amenities') {
                    updates.push('amenities = ?');
                    values.push(JSON.stringify(req.body[field]));
                } else {
                    updates.push(`${field} = ?`);
                    values.push(req.body[field]);
                }
            }
        }

        if (updates.length === 0) {
            console.warn(`[AdminRooms] No valid fields found in request body for ID ${id}`);
            return res.status(400).json({
                error: '沒有提供要更新的欄位',
                received: Object.keys(req.body)
            });
        }

        values.push(id);
        const query = `UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`;

        await pool.query(query, values);

        await AuditService.recordAction(req, 'UPDATE_ROOM_TYPE', 'ROOM_TYPE', id, { updatedFields: updates.map(u => u.split(' = ')[0]) });

        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Failed to update room type:', err);
        res.status(500).json({ error: '更新房型失敗', details: err.message });
    }
});

// DELETE /api/admin/room-types/:id - Delete room type
router.delete('/room-types/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM rooms WHERE id = ?', [id]);

        await AuditService.recordAction(req, 'DELETE_ROOM_TYPE', 'ROOM_TYPE', id, { note: 'All associated images and instances should be handled by DB constraints' });

        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Failed to delete room type:', err);
        res.status(500).json({ error: '刪除房型失敗' });
    }
});

// GET /api/admin/room-types/:id/images - List gallery images
router.get('/room-types/:id/images', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM room_images WHERE room_id = ? ORDER BY display_order ASC', [id]);
        res.json(rows);
    } catch (err) {
        console.error('[Admin] Failed to fetch room images:', err);
        res.status(500).json({ error: '無法獲取圖片列表' });
    }
});

// POST /api/admin/room-types/:id/images - Upload gallery image
router.post('/room-types/:id/images', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).json({ error: '請選擇要上傳的檔案' });
    }

    const imagePath = `/uploads/rooms/${req.file.filename}`;

    try {
        await pool.query(
            'INSERT INTO room_images (room_id, image_url) VALUES (?, ?)',
            [id, imagePath]
        );
        res.json({ success: true, imagePath });
    } catch (err) {
        console.error('[Admin] Failed to insert room image:', err);
        res.status(500).json({ error: '新增圖片失敗' });
    }
});

// DELETE /api/admin/room-images/:id - Delete gallery image
router.delete('/room-images/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // First get the file path to delete it
        const [rows] = await pool.query('SELECT image_url FROM room_images WHERE id = ?', [id]);
        if (rows.length > 0) {
            const imagePath = rows[0].image_url;
            const fullPath = path.join(__dirname, '../public', imagePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }

        await pool.query('DELETE FROM room_images WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Failed to delete room image:', err);
        res.status(500).json({ error: '刪除圖片失敗' });
    }
});

// POST /api/admin/room-types/:id/upload - Upload room cover image
router.post('/room-types/:id/upload', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).json({ error: '請選擇要上傳的檔案' });
    }

    const imagePath = `/uploads/rooms/${req.file.filename}`;

    try {
        // Get the old image path before updating
        const [rows] = await pool.query('SELECT main_image FROM rooms WHERE id = ?', [id]);

        if (rows.length > 0 && rows[0].main_image) {
            const oldImagePath = rows[0].main_image;

            // Only delete if it's a local file (starts with /uploads/)
            if (oldImagePath.startsWith('/uploads/')) {
                const fullPath = path.join(__dirname, '../public', oldImagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    console.log(`[Admin] Deleted old cover image: ${oldImagePath}`);
                }
            }
        }

        // Update to new image path
        await pool.query(
            'UPDATE rooms SET main_image = ? WHERE id = ?',
            [imagePath, id]
        );

        res.json({ success: true, imagePath });
    } catch (err) {
        console.error('[Admin] Failed to update room image path:', err);
        res.status(500).json({ error: '更新房型圖片失敗' });
    }
});


// GET /api/admin/room-instances - List all room instances
router.get('/room-instances', async (req, res) => {
    const { room_type_id } = req.query;
    try {
        let query = `
            SELECT ri.id, ri.room_type_id, ri.hotel_id, ri.room_number, ri.created_at, ri.updated_at,
            CASE
                WHEN ri.status = 'maintenance' THEN 'maintenance'
                WHEN EXISTS (
                    SELECT 1 FROM bookings b
                    WHERE b.room_instance_id = ri.id
                    AND b.status IN ('confirmed')
                    AND b.check_in_date <= CURRENT_DATE()
                    AND b.check_out_date > CURRENT_DATE()
                ) THEN 'occupied'
                ELSE 'available'
            END as status,
            r.room_type
            FROM room_instances ri
            JOIN rooms r ON ri.room_type_id = r.id
        `;
        const params = [];

        if (room_type_id) {
            query += ' WHERE ri.room_type_id = ?';
            params.push(room_type_id);
        }

        query += ' ORDER BY ri.room_number ASC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('[Admin] Failed to fetch room instances:', err);
        res.status(500).json({ error: '無法獲取房間清單' });
    }
});

// POST /api/admin/room-instances - Create new instance
router.post('/room-instances', async (req, res) => {
    const { room_type_id, hotel_id, room_number } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO room_instances (room_type_id, hotel_id, room_number) VALUES (?, ?, ?)',
            [room_type_id, hotel_id, room_number]
        );

        const newId = result.insertId;
        await AuditService.recordAction(req, 'CREATE_ROOM_INSTANCE', 'ROOM_INSTANCE', newId, { room_number, room_type_id });

        res.status(201).json({ success: true });
    } catch (err) {
        console.error('[Admin] Failed to create room instance:', err);
        res.status(500).json({ error: '建立房間失敗' });
    }
});

// DELETE /api/admin/room-instances/:id - Delete instance
router.delete('/room-instances/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM room_instances WHERE id = ?', [id]);

        await AuditService.recordAction(req, 'DELETE_ROOM_INSTANCE', 'ROOM_INSTANCE', id);

        res.json({ success: true });
    } catch (err) {
        console.error('[Admin] Failed to delete room instance:', err);
        res.status(500).json({ error: '刪除房間失敗' });
    }
});



// Temporary endpoint to fix room images
router.post('/fix-all-images', async (req, res) => {
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
        res.json({ success: true, message: 'Updated all images via internal route' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
