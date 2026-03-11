
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'hotel',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

async function removePriceColumns() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Drop index on price first if it exists
        try {
            await connection.execute('ALTER TABLE rooms DROP INDEX idx_price');
            console.log('Dropped idx_price from rooms.');
        } catch (err) {
            console.log('Index idx_price might not exist or already dropped:', err.message);
        }

        // Drop price_per_night from rooms
        try {
            await connection.execute('ALTER TABLE rooms DROP COLUMN price_per_night');
            console.log('Dropped price_per_night from rooms.');
        } catch (err) {
            console.log('Column price_per_night might not exist:', err.message);
        }

        // Drop total_price from bookings
        try {
            await connection.execute('ALTER TABLE bookings DROP COLUMN total_price');
            console.log('Dropped total_price from bookings.');
        } catch (err) {
            console.log('Column total_price might not exist:', err.message);
        }

        console.log('Database schema updated successfully.');

    } catch (error) {
        console.error('Error updating database:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

removePriceColumns();
