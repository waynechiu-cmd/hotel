require('dotenv').config();
const NotificationService = require('./services/notificationService');

async function testEmail() {
    console.log('🧪 Testing Email Notification...');
    console.log('SMTP Config:');
    console.log('- HOST:', process.env.SMTP_HOST);
    console.log('- USER:', process.env.SMTP_USER);

    const dummyBooking = {
        booking_reference: 'TEST-REFIX-' + Date.now(),
        guest_name: 'Antigravity Test',
        guest_email: 'wayne.chiu@cch.com.tw',
        guest_phone: '0912345678',
        room_type: '測試房型',
        room_number: '999',
        check_in_date: new Date(),
        check_out_date: new Date(Date.now() + 86400000),
        num_guests: 1
    };

    try {
        const result = await NotificationService.sendBookingConfirmation(dummyBooking);
        if (result && result !== true) {
            console.log('✅ Email sent successfully!');
            console.log('Message ID:', result.messageId);
        } else if (result === true) {
            console.log('⚠️ Email was MOCKED (check env vars)');
        } else {
            console.log('❌ Email failed to send');
        }
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
    process.exit(0);
}

testEmail();
