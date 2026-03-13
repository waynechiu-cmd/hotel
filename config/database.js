const mysql = require('mysql2/promise');
// Redundant dotenv call removed, handled in server.js

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
});

console.log(`[Database] Initializing pool for ${process.env.DB_USER}@${process.env.DB_HOST} (PW length: ${process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0})`);

// Test connection function
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✓ Database connection successful');
        connection.release();
        return true;
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        return false;
    }
}

module.exports = { pool, testConnection };
