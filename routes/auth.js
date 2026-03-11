const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Validate JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('❌ SECURITY ERROR: JWT_SECRET must be set and be at least 32 characters');
    process.exit(1);
} else {
    const hex = Buffer.from(JWT_SECRET.substring(0, 5)).toString('hex');
    console.log(`[AuthGen-Debug] JWT_SECRET loaded. Length: ${JWT_SECRET.length}, Start (Hex): ${hex}`);
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    let { username, password, email } = req.body;

    // Allow login with email field as well
    if (!username && email) {
        username = email;
    }

    if (!username || !password) {
        return res.status(400).json({ error: '請提供帳號和密碼' });
    }

    try {
        // Query user by email (using username as email for simplicity in this demo)
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [username.includes('@') ? username : `${username}@cc-house.cc`]);

        if (users.length === 0) {
            console.log(`[Auth] User not found for input: ${username} (searched: ${username.includes('@') ? username : `${username}@cc-house.cc`})`);
            return res.status(401).json({ error: '使用者不存在或密碼錯誤' });
        }

        const user = users[0];

        // Check if account is locked
        if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
            const remaining = Math.ceil((new Date(user.lockout_until) - new Date()) / 1000 / 60);
            return res.status(403).json({ error: `帳號已鎖定，請於 ${remaining} 分鐘後再試` });
        }

        // Verify password with bcrypt
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            console.log(`[Auth] Password mismatch for user: ${user.email}`);

            // Increment failed attempts
            const newAttempts = (user.failed_login_attempts || 0) + 1;
            let updateQuery = 'UPDATE users SET failed_login_attempts = ? WHERE id = ?';
            const params = [newAttempts, user.id];

            // Lock if attempts >= 3
            if (newAttempts >= 3) {
                const lockoutTime = new Date(Date.now() + 15 * 60000); // 15 minutes from now
                updateQuery = 'UPDATE users SET failed_login_attempts = ?, lockout_until = ? WHERE id = ?';
                params[1] = lockoutTime;
                params[2] = user.id; // Adjust index because we inserted lockoutTime
            }

            await pool.query(updateQuery, params);

            if (newAttempts >= 3) {
                return res.status(403).json({ error: '密碼錯誤次數過多，帳號已鎖定 15 分鐘' });
            }

            return res.status(401).json({ error: `密碼錯誤 (剩餘嘗試次數: ${3 - newAttempts})` });
        }

        // Reset failed attempts on success
        if (user.failed_login_attempts > 0 || user.lockout_until) {
            await pool.query('UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = ?', [user.id]);
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, permissions: user.permissions },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                permissions: user.permissions
            }
        });

    } catch (err) {
        console.error('[Auth] Login error:', err);
        res.status(500).json({ error: '登入失敗，請稍後再試' });
    }
});

module.exports = router;
