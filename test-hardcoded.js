const mysql = require('mysql2/promise');

async function testHardcoded() {
    console.log('--- Hardcoded DB Test ---');
    try {
        const connection = await mysql.createConnection({
            host: '35.201.240.143',
            user: 'hotel',
            password: '.F$~Jio$m$4D]MSA', // Hardcoded literal
            database: 'hotel',
            port: 3306
        });

        console.log('✅ Hardcoded Connection Successful!');
        await connection.end();
    } catch (err) {
        console.log('❌ Hardcoded Connection Failed!');
        console.error('Error:', err.message);
    }
}

testHardcoded();
