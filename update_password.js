require('dotenv').config();
const pool = require('./src/config/db');

async function updatePassword() {
    try {
        const res = await pool.query("UPDATE users SET password = 'S09191' WHERE employee_id = 'S09191' RETURNING *");
        if (res.rows.length > 0) {
            console.log('Password updated successfully for S09191:', res.rows[0].employee_id);
        } else {
            console.log('User S09191 not found to update password');
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

updatePassword();
