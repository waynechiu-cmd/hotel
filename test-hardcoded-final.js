const mysql = require('mysql2/promise');

async function testFinal() {
    console.log('--- Final Hardcoded DB Test ---');
    try {
        const connection = await mysql.createConnection({
            host: '35.201.240.143',
            user: 'hotel',
            password: 'CCHouse_2026_Secure!',
            database: 'hotel',
            port: 3306
        });

        console.log('✅ Final Hardcoded Connection Successful!');
        await connection.end();
    } catch (err) {
        console.log('❌ Final Hardcoded Connection Failed!');
        console.error('Error:', err.message);
    }
}

testFinal();
