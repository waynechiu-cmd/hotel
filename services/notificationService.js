const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

// Create reusable transporter object using the default SMTP transport
// For development, we can use Ethereal Email or a dummy logger if no config
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

class NotificationService {

    /**
     * Send booking confirmation via Email
     */
    static async sendBookingConfirmation(booking) {
        console.log(`[Notification] Preparing confirmation for Booking ${booking.booking_reference}`);

        // Format dates in readable format
        const checkInDate = new Date(booking.check_in_date).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const checkOutDate = new Date(booking.check_out_date).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });

        const mailOptions = {
            from: '"兆基訂房系統通知" <hotel@cch.com.tw>',
            to: booking.guest_email,
            subject: `兆基-訂房確認通知 - ${booking.booking_reference}`,
            text: `親愛的 ${booking.guest_name} 您好，\n\n您的訂房已確認！\n\n訂單編號：${booking.booking_reference}\n房型：${booking.room_type}\n房號：${booking.room_number || '待安排'}\n入住日期：${checkInDate}\n退房日期：${checkOutDate}\n入住人數：${booking.num_guests} 位\n\n期待您的光臨！\n\n兆基訂房系統`,
            html: `
                <div style="font-family: 'Microsoft JhengHei', '微軟正黑體', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2 style="color: white; margin: 0; font-size: 24px;">訂房確認通知 ✅</h2>
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 16px; margin-bottom: 20px;">親愛的 <strong>${booking.guest_name}</strong> 您好，</p>
                        <p style="font-size: 14px; color: #666; margin-bottom: 25px;">您的訂房已確認！以下是您的訂房資訊：</p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 12px 0; font-weight: bold; color: #667eea; width: 35%;">訂單編號</td>
                                    <td style="padding: 12px 0; font-size: 16px;"><strong>${booking.booking_reference}</strong></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 12px 0; font-weight: bold; color: #667eea;">房型</td>
                                    <td style="padding: 12px 0;">${booking.room_type}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 12px 0; font-weight: bold; color: #667eea;">房號</td>
                                    <td style="padding: 12px 0;">${booking.room_number || '待安排'}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 12px 0; font-weight: bold; color: #667eea;">入住日期</td>
                                    <td style="padding: 12px 0;">${checkInDate}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 12px 0; font-weight: bold; color: #667eea;">退房日期</td>
                                    <td style="padding: 12px 0;">${checkOutDate}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; font-weight: bold; color: #667eea;">入住人數</td>
                                    <td style="padding: 12px 0;">${booking.num_guests} 位</td>
                                </tr>
                            </table>
                        </div>
                        
                        <p style="margin-top: 25px; font-size: 14px; color: #666; line-height: 1.6;">期待您的光臨！</p>
                        <p style="margin-top: 5px; font-size: 14px; color: #999;">如有任何問題，歡迎與我們聯繫。</p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; color: #999; font-size: 12px;">
                            <p style="margin: 0;">兆基訂房系統</p>
                        </div>
                    </div>
                </div>
            `
        };

        try {
            if (process.env.NODE_ENV === 'test' || !process.env.SMTP_HOST || !process.env.SMTP_USER) {
                console.log('[Notification] Mock Email Sent (Missing Credentials):', mailOptions);
                return true;
            }
            const info = await transporter.sendMail(mailOptions);
            console.log(`[Notification] Email sent: ${info.messageId}`);

            // Also trigger "LINE" notification (Mock)
            this.sendLineNotification(booking.guest_phone, `訂房確認 ${booking.booking_reference}`);

            return info;
        } catch (error) {
            console.error('[Notification] Email Failed:', error);
            // Don't throw error to avoid blocking the API response, just log it
            return false;
        }
    }

    /**
     * Simulate sending LINE/SMS notification
     */
    static async sendLineNotification(phone, message) {
        console.log(`[Notification] Mock LINE/SMS sent to ${phone}: ${message}`);
        return true;
    }
    /**
     * Send Work Order Assignment Notification via Email
     */
    static async sendWorkOrderNotification(workOrder, staffEmail, staffName) {
        console.log(`[Notification] Sending Work Order #${workOrder.id} assignment to ${staffName}`);

        const mailOptions = {
            from: '"兆基派工系統" <work-order@cch.com.tw>',
            to: staffEmail,
            subject: `【新工單指派】#${workOrder.id} - ${workOrder.category}`,
            html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background: #4F46E5; padding: 20px; color: white; text-align: center;">
                        <h2 style="margin: 0;">新指派工單 ✅</h2>
                    </div>
                    <div style="padding: 20px;">
                        <p>親愛的 <strong>${staffName}</strong> 您好，</p>
                        <p>您有一項新的工作任務已指派，請儘速處理：</p>
                        <div style="background: #f8fafc; padding: 15px; border-radius: 4px; margin: 20px 0;">
                            <p><strong>工單編號：</strong> #${workOrder.id}</p>
                            <p><strong>類別：</strong> ${workOrder.category}</p>
                            <p><strong>優先級：</strong> <span style="color: ${workOrder.priority === 'critical' ? 'red' : 'inherit'}">${workOrder.priority}</span></p>
                            <p><strong>地點：</strong> ${workOrder.roomNumber || '公共區域'}</p>
                            <p><strong>描述：</strong> ${workOrder.description}</p>
                        </div>
                        <p style="text-align: center; margin-top: 30px;">
                            <a href="https://hotel.cch.com.tw/staff/" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">查看我的工單</a>
                        </p>
                    </div>
                    <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
                        兆基訂房管理系統 - 自動發送郵件
                    </div>
                </div>
            `
        };

        try {
            if (process.env.NODE_ENV === 'test' || !process.env.SMTP_HOST || !process.env.SMTP_USER) {
                console.log('[Notification] Mock WO Email Sent (Missing Credentials):', mailOptions);
                return true;
            }
        } catch (error) {
            console.error('[Notification] WO Email Failed:', error);
            return false;
        }
    }

    /**
     * Send Summary Low Stock Alert via Email
     */
    static async sendBulkLowStockAlert(items) {
        if (!items || items.length === 0) return true;

        const targetEmail = 'wayne.chiu@cch.com.tw';
        console.log(`[Notification] Sending Bulk Low Stock Alert for ${items.length} items to ${targetEmail}`);

        const itemsHtml = items.map(item => `
            <div style="background: #fef2f2; padding: 15px; border-radius: 4px; margin-bottom: 10px; border: 1px solid #fecaca;">
                <p style="margin: 0;"><strong>品名：</strong> ${item.name}</p>
                <p style="margin: 5px 0 0 0;"><strong>代號：</strong> ${item.code}</p>
                <p style="margin: 5px 0 0 0;"><strong>目前數量：</strong> <span style="color: #EF4444; font-weight: bold;">${item.quantity}</span> (閾值: ${item.alert_threshold})</p>
            </div>
        `).join('');

        const mailOptions = {
            from: '"兆基庫存系統" <inventory@cch.com.tw>',
            to: targetEmail,
            subject: `【庫存彙整告警】共有 ${items.length} 項品項數量過低！`,
            html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 8px; overflow: hidden;">
                    <div style="background: #EF4444; padding: 20px; color: white; text-align: center;">
                        <h2 style="margin: 0;">⚠️ 庫存低水位摘要通知</h2>
                    </div>
                    <div style="padding: 20px;">
                        <p>您好，系統偵測到以下品項庫存已低於設定閾值：</p>
                        ${itemsHtml}
                        <p style="text-align: center; margin-top: 30px;">
                            <a href="https://hotel.cch.com.tw/admin.html" style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">前往後台管理</a>
                        </p>
                    </div>
                    <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
                        兆基訂房管理系統 - 自動發送郵件
                    </div>
                </div>
            `
        };

        try {
            if (process.env.NODE_ENV === 'test' || !process.env.SMTP_HOST || !process.env.SMTP_USER) {
                console.log('[Notification] Mock Bulk Stock Alert Email Sent (Missing Credentials):', mailOptions);
                return true;
            }
            return await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('[Notification] Bulk Stock Alert Email Failed:', error);
            return false;
        }
    }

    static async checkInventoryItem(itemId) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM inventory WHERE id = ? AND quantity <= alert_threshold',
                [itemId]
            );

            if (rows.length > 0) {
                const item = rows[0];
                if (!item.last_alert_sent_at || new Date(item.last_alert_sent_at) < new Date(Date.now() - 4 * 60 * 60 * 1000)) {
                    console.log(`[Notification] Immediate Low Stock Alert for item ${item.name} (${item.code})`);
                    const success = await this.sendBulkLowStockAlert([item]);
                    if (success) {
                        await pool.query('UPDATE inventory SET last_alert_sent_at = NOW() WHERE id = ?', [itemId]);
                        return true;
                    }
                } else {
                    console.log(`[Notification] Low Stock Alert suppressed (Cooldown active) for ${item.name}`);
                }
            }
        } catch (error) {
            console.error('[Notification] Check Inventory Item Failed:', error);
        }
        return false;
    }

    static async checkAllInventory() {
        console.log(`[Scheduler] Running inventory low-stock check at ${new Date().toISOString()}`);
        try {
            const [lowStockItems] = await pool.query(
                'SELECT * FROM inventory WHERE quantity <= alert_threshold AND (last_alert_sent_at IS NULL OR last_alert_sent_at < DATE_SUB(NOW(), INTERVAL 4 HOUR))'
            );

            if (lowStockItems.length > 0) {
                const success = await this.sendBulkLowStockAlert(lowStockItems);
                if (success) {
                    const ids = lowStockItems.map(i => i.id);
                    await pool.query('UPDATE inventory SET last_alert_sent_at = NOW() WHERE id IN (?)', [ids]);
                    console.log(`[Scheduler] Sent alerts for ${lowStockItems.length} items`);
                }
            } else {
                console.log('[Scheduler] No low stock items requiring alert');
            }
        } catch (err) {
            console.error('[Scheduler] Inventory check failed:', err);
        }
    }
}

module.exports = NotificationService;
