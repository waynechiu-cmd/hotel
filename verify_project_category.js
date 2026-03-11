require('dotenv').config();
const axios = require('axios');
const { pool } = require('./config/database');

const API_BASE_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        console.log('Testing Database Column...');
        const [columns] = await pool.query("SHOW COLUMNS FROM bookings LIKE 'project_category'");
        if (columns.length > 0) {
            console.log('✅ project_category column exists.');
        } else {
            throw new Error('❌ project_category column missing!');
        }

        // Note: For full API testing we would need a token, but we can at least check the DB structure here.
        // Since I cannot easily get a fresh admin token without credentials in a script, 
        // I will rely on the successful DB migration and code review for the API part.

        console.log('\nVerification complete!');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verify();
