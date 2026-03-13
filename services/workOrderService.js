const { pool } = require('../config/database');

class WorkOrderService {

    /**
     * Create a new work order
     */
    static async createTicket({ roomId, reportedBy, assignedTo, category, priority, description, status }) {
        const [result] = await pool.query(`
            INSERT INTO work_orders 
            (room_id, reported_by, assigned_to, category, priority, description, status, photo_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
        `, [
            roomId || null,
            reportedBy,
            assignedTo || null,
            category,
            priority || 'medium',
            description,
            status || 'open'
        ]);

        return result.insertId;
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
                status: 'open'
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
            SELECT w.*, r.room_type, u.full_name as reported_by_name, s.full_name as assigned_to_name
            FROM work_orders w
            LEFT JOIN rooms r ON w.room_id = r.id
            LEFT JOIN users u ON w.reported_by = u.id
            LEFT JOIN users s ON w.assigned_to = s.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.status) {
            query += ' AND w.status = ?';
            params.push(filters.status);
        }

        if (filters.category) {
            query += ' AND w.category = ?';
            params.push(filters.category);
        }

        if (filters.assignedTo) {
            query += ' AND w.assigned_to = ?';
            params.push(filters.assignedTo);
        }

        query += ' ORDER BY w.priority = "critical" DESC, w.created_at DESC';

        const [rows] = await pool.query(query, params);
        return rows;
    }

    /**
     * Update work order status
     */
    static async updateStatus(id, status, assignedTo) {
        let query = 'UPDATE work_orders SET status = ?, updated_at = NOW()';
        const params = [status];

        if (assignedTo) {
            query += ', assigned_to = ?';
            params.push(assignedTo);
        }

        if (status === 'resolved' || status === 'closed') {
            query += ', resolved_at = NOW()';
        }

        query += ' WHERE id = ?';
        params.push(id);

        const [result] = await pool.query(query, params);
        return result.affectedRows > 0;
    }
}

module.exports = WorkOrderService;
