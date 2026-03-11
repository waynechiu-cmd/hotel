require('dotenv').config();
const { pool } = require('./config/database');

async function testUpdate() {
    try {
        console.log('--- Room Project Update Test ---');

        // 1. Pick a room to test (id: 7 - 房型A)
        const roomId = 7;
        const testProjectName = '光寶科宿舍專案-' + Date.now();

        console.log(`Step 1: Updating Room ID ${roomId} to project "${testProjectName}"...`);

        // Simulating the backend SQL logic in routes/admin_rooms.js
        const query = "UPDATE rooms SET project_name = ? WHERE id = ?";
        const [result] = await pool.query(query, [testProjectName, roomId]);

        if (result.affectedRows > 0) {
            console.log('✅ Update successful in database.');
        } else {
            console.log('❌ Update failed: Room not found or no rows affected.');
            process.exit(1);
        }

        // 2. Verify the update
        console.log('Step 2: Verifying data in database...');
        const [rows] = await pool.query("SELECT id, room_type, project_name FROM rooms WHERE id = ?", [roomId]);

        if (rows[0].project_name === testProjectName) {
            console.log(`✅ Verification passed! Room ${roomId} is now in project "${rows[0].project_name}".`);
        } else {
            console.log(`❌ Verification failed! Expected "${testProjectName}" but got "${rows[0].project_name}".`);
            process.exit(1);
        }

        // 3. Reset to a clean state
        console.log('Step 3: Resetting to "光寶科宿舍專案"...');
        await pool.query("UPDATE rooms SET project_name = ? WHERE id = ?", ['光寶科宿舍專案', roomId]);

        console.log('--- Test Finished: SUCCESS ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test error:', error);
        process.exit(1);
    }
}

testUpdate();
