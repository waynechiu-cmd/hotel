const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    console.log('--- DB Connection Test ---');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('DB:', process.env.DB_NAME);
    console.log('Password Length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0);

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT) || 3306
        });

        console.log('✅ Connection Successful!');
        const [rows] = await connection.execute('SELECT USER(), CURRENT_USER()');
        console.log('User info:', rows[0]);
        await connection.end();
    } catch (err) {
        console.log('❌ Connection Failed!');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        if (err.fatal) console.error('Fatal Error');
    }
}

run();
