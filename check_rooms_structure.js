require('dotenv').config();
const { pool } = require('./config/database');

async function check() {
    try {
        const [rows] = await pool.query("DESCRIBE rooms");
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
check();
