const nodemailer = require('nodemailer');

// Create reusable transporter object using the default SMTP transport
// For development, we can use Ethereal Email or a dummy logger if no config
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass'
    }
});

class NotificationService {

    /**
     * Send booking confirmation via Email
     */
    static async sendBookingConfirmation(booking) {
        console.log(`[Notification] Preparing confirmation for Booking ${booking.booking_reference}`);

        const mailOptions = {
            from: '"CC House Hotel" <no-reply@cc-house.cc>',
            to: booking.guest_email,
            subject: `Booking Confirmed: ${booking.booking_reference}`,
            text: `Dear ${booking.guest_name},\n\nYour booking at CC House is confirmed!\nRef: ${booking.booking_reference}\nDates: ${booking.check_in_date} to ${booking.check_out_date}\n\nThank you for choosing us!`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Booking Confirmed! ✅</h2>
                    <p>Dear <strong>${booking.guest_name}</strong>,</p>
                    <p>Thank you for choosing CC House. Your reservation details are below:</p>
                    <ul>
                        <li><strong>Reference:</strong> ${booking.booking_reference}</li>
                        <li><strong>Check-in:</strong> ${booking.check_in_date}</li>
                        <li><strong>Check-out:</strong> ${booking.check_out_date}</li>
                        <li><strong>Total Price:</strong> $${booking.total_price}</li>
                    </ul>
                    <p>We look forward to welcoming you!</p>
                </div>
            `
        };

        try {
            if (process.env.NODE_ENV === 'test' || !process.env.SMTP_HOST) {
                console.log('[Notification] Mock Email Sent:', mailOptions);
                return true;
            }
            const info = await transporter.sendMail(mailOptions);
            console.log(`[Notification] Email sent: ${info.messageId}`);

            // Also trigger "LINE" notification (Mock)
            this.sendLineNotification(booking.guest_phone, `Booking ${booking.booking_reference} Confirmed!`);

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
    static async sendLineNotification(phoneNumber, message) {
        // In a real app, this would call LINE Messaging API or Twilio
        console.log(`[LINE/SMS] 📲 Sending to ${phoneNumber}: "${message}"`);
        return true;
    }

    /**
     * Send Check-in Reminder (T-1 Day)
     */
    static async sendCheckInReminder(booking) {
        console.log(`[Notification] Sending Check-in Reminder for ${booking.booking_reference}`);
        // Logic to send reminder...
        return true;
    }
}

module.exports = NotificationService;
