const { pool } = require('../config/database');

class WorkOrderService {

    /**
     * Generate sequential ticket number (YYYYMMDD0001)
     */
    static async generateTicketNumber() {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const [rows] = await pool.query(
            'SELECT ticket_number FROM work_orders WHERE ticket_number LIKE ? ORDER BY ticket_number DESC LIMIT 1',
            [`${today}%`]
        );

        if (rows.length === 0) {
            return `${today}0001`;
        }

        const lastNumber = parseInt(rows[0].ticket_number.slice(-4));
        const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
        return `${today}${nextNumber}`;
    }

    /**
     * Create a new work order
     */
    static async createTicket({ roomId, reportedBy, assignedTo, category, priority, description, status }) {
        const ticketNumber = await this.generateTicketNumber();

        const [result] = await pool.query(`
            INSERT INTO work_orders 
            (ticket_number, room_id, reported_by, assigned_to, category, priority, description, status, photo_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
        `, [
            ticketNumber,
            roomId || null,
            reportedBy,
            assignedTo || null,
            category,
            priority || 'medium',
            description,
            status || 'pending'
        ]);

        const ticketId = result.insertId;

        // Log creation
        await pool.query(`
            INSERT INTO work_order_logs (work_order_id, changed_by, new_status, comment)
            VALUES (?, ?, ?, ?)
        `, [ticketId, reportedBy, status || 'pending', '工單建立']);

        return ticketId;
    }

    /**
     * Auto-dispatch a cleaning task for a room
     * Triggered when booking status -> completed/checked-out
     */
    static async autoCreateCleaningTask(roomId) {
        console.log(`[WorkOrder] 🧹 Auto-dispatching cleaning for Room ${roomId}`);

        // In a real system, 'reportedBy' might be a system bot user ID. 
        // We'll use ID 1 (Admin) for now as the 'reporter'.
        const SYSTEM_USER_ID = 1;

        try {
            const ticketId = await this.createTicket({
                roomId,
                reportedBy: SYSTEM_USER_ID,
                category: 'cleaning',
                priority: 'high',
                description: 'Post-checkout cleaning required. Please sanitize and restock.',
                status: 'pending'
            });
            console.log(`[WorkOrder] Cleaning Ticket #${ticketId} created.`);
            return ticketId;
        } catch (error) {
            console.error('[WorkOrder] Failed to auto-create cleaning task:', error);
            return null;
        }
    }

    /**
     * Get all work orders with optional filters
     */
    static async getWorkOrders(filters = {}) {
        let query = `
            SELECT w.*, ri.room_number, r.room_type, u.full_name as reported_by_name, s.full_name as assigned_to_name
            FROM work_orders w
            LEFT JOIN room_instances ri ON w.room_id = ri.id
            LEFT JOIN rooms r ON ri.room_type_id = r.id
            LEFT JOIN users u ON w.reported_by = u.id
            LEFT JOIN users s ON w.assigned_to = s.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.status) {
            query += ' AND w.status = ?';
            params.push(filters.status);
        } else if (filters.is_open) {
            query += ' AND w.status IN ("pending", "in_progress")';
        }

        if (filters.category) {
            query += ' AND w.category = ?';
            params.push(filters.category);
        }

        if (filters.assignedTo) {
            query += ' AND w.assigned_to = ?';
            params.push(filters.assignedTo);
        }

        query += ' ORDER BY w.status = "pending" DESC, w.priority = "critical" DESC, w.created_at DESC';

        const [rows] = await pool.query(query, params);
        return rows;
    }

    /**
     * Update work order status
     */
    static async updateStatus(id, status, assignedTo, roomId, description, priority, photoUrl, staffRemarks, changedBy) {
        // 1. Get old status for logging
        const [oldOrders] = await pool.query('SELECT status FROM work_orders WHERE id = ?', [id]);
        const oldStatus = oldOrders.length > 0 ? oldOrders[0].status : null;

        let query = 'UPDATE work_orders SET';
        const params = [];
        const updates = [];

        updates.push(' updated_at = NOW()'); // Always update updated_at

        if (status !== undefined) {
            updates.push(' status = ?');
            params.push(status);
        }

        if (assignedTo !== undefined) {
            updates.push(' assigned_to = ?');
            params.push(assignedTo || null);
        }

        if (roomId !== undefined) {
            updates.push(' room_id = ?');
            params.push(roomId || null);
        }

        if (description !== undefined) {
            updates.push(' description = ?');
            params.push(description);
        }

        if (priority !== undefined) {
            updates.push(' priority = ?');
            params.push(priority);
        }

        if (photoUrl !== undefined) {
            updates.push(' photo_url = ?');
            params.push(photoUrl);
        }

        if (staffRemarks !== undefined) {
            updates.push(' staff_remarks = ?');
            params.push(staffRemarks);
        }

        if (status === 'completed') {
            updates.push(' resolved_at = NOW()');
        }

        if (updates.length === 0) {
            return false;
        }

        query += updates.join(',') + ' WHERE id = ?';
        params.push(id);

        const [result] = await pool.query(query, params);

        if (result.affectedRows > 0 && status && status !== oldStatus) {
            // Log status change
            await pool.query(`
                INSERT INTO work_order_logs (work_order_id, changed_by, old_status, new_status, comment)
                VALUES (?, ?, ?, ?, ?)
            `, [id, changedBy || null, oldStatus, status, staffRemarks || '狀態更新']);
        }

        return result.affectedRows > 0;
    }
}

module.exports = WorkOrderService;
