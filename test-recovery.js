const mysql = require('mysql2/promise');

async function testActual() {
    // The "actual" password the database seems to have, based on HEX analysis
    const actualPw = '.F$~JioD]MSA';
    console.log('--- Actual Password Discovery Test ---');
    console.log('Testing Password:', actualPw);
    console.log('Password Length:', actualPw.length);

    try {
        const connection = await mysql.createConnection({
            host: '35.201.240.143',
            user: 'hotel',
            password: actualPw,
            database: 'hotel',
            port: 3306
        });

        console.log('✅ Connection Successful with Actual Password!');
        await connection.end();
    } catch (err) {
        console.log('❌ Connection Failed!');
        console.error('Error:', err.message);
    }
}

testActual();
