require('dotenv').config();
const { pool } = require('./config/database');

async function migrate() {
    try {
        console.log('Starting rooms migration...');
        await pool.query("ALTER TABLE rooms ADD COLUMN project_name VARCHAR(100) DEFAULT '其他' AFTER room_type;");
        console.log('Migration successful: project_name column added to rooms table.');

        const [rows] = await pool.query("DESCRIBE rooms");
        console.log('Current rooms table structure:');
        console.table(rows);

        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column project_name already exists in rooms table.');
            process.exit(0);
        }
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
