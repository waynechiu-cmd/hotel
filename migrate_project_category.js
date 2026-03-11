require('dotenv').config();
const { pool } = require('./config/database');

async function migrate() {
    try {
        console.log('Starting migration...');
        await pool.query("ALTER TABLE bookings ADD COLUMN project_category VARCHAR(50) DEFAULT '一般' AFTER status");
        console.log('Migration successful: project_category column added.');

        const [rows] = await pool.query("DESCRIBE bookings");
        console.log('Current bookings table structure:');
        console.table(rows);

        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column project_category already exists.');
            process.exit(0);
        }
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
