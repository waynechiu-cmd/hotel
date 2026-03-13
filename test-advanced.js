const mysql = require('mysql2/promise');

async function testAdvanced() {
    const pw = '.F$~Jio$m$4D]MSA';
    console.log('--- Advanced DB Test ---');
    console.log('Password Length:', pw.length);
    console.log('Password HEX (Node):', Buffer.from(pw).toString('hex'));

    try {
        console.log('Trying with SSL (rejectUnauthorized: false)...');
        const connection = await mysql.createConnection({
            host: '35.201.240.143',
            user: 'hotel',
            password: pw,
            database: 'hotel',
            port: 3306,
            ssl: {
                rejectUnauthorized: false
            }
        });

        console.log('✅ Advanced Connection Successful!');
        await connection.end();
    } catch (err) {
        console.log('❌ Advanced Connection Failed!');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
    }
}

testAdvanced();
