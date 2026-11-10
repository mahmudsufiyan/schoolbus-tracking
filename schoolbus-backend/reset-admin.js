const bcrypt = require('bcrypt');
const pool = require('./db'); // Make sure this matches where your db.js is

async function resetPassword() {
    try {
        // This sets the password to: admin123
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const result = await pool.query(
            `UPDATE users SET password_hash = $1 WHERE email = 'admin@schoolbus.com' RETURNING *`,
            [hashedPassword]
        );

        if (result.rowCount > 0) {
            console.log('✅ Password reset successfully to: admin123');
        } else {
            console.log('❌ User not found. Check the email address.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

resetPassword();