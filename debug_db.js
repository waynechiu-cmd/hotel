require('dotenv').config();
const { pool } = require('./config/database');

async function debugBooking() {
    try {
        const checkIn = '2026-02-06';
        const checkOut = '2026-02-17';

        console.log(`Checking conflicts for range: ${checkIn} to ${checkOut}`);

        const [bookings] = await pool.query(`
            SELECT b.id, b.room_instance_id, b.check_in_date, b.check_out_date, b.status, ri.room_number
            FROM bookings b
            LEFT JOIN room_instances ri ON b.room_instance_id = ri.id
            WHERE b.status IN ('confirmed', 'pending')
        `);

        console.log('All active bookings:');
        bookings.forEach(b => {
            console.log(`ID: ${b.id}, Room: ${b.room_number} (Instance ID: ${b.room_instance_id}), In: ${b.check_in_date.toISOString().split('T')[0]}, Out: ${b.check_out_date.toISOString().split('T')[0]}, Status: ${b.status}`);

            const conflict = (new Date(b.check_in_date) < new Date(checkOut) && new Date(b.check_out_date) > new Date(checkIn));
            if (conflict) {
                console.log(`  >>> CONFLICT DETECTED with this booking!`);
            }
        });

        const [instances] = await pool.query('SELECT * FROM room_instances');
        console.log('\nRoom Instances:');
        instances.forEach(ri => {
            console.log(`ID: ${ri.id}, Number: ${ri.room_number}, Type ID: ${ri.room_type_id}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugBooking();
