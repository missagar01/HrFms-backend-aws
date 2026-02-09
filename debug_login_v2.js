require('dotenv').config();
const pool = require('./src/config/db');

async function debugUser() {
    try {
        const res = await pool.query("SELECT employee_id, password FROM users WHERE employee_id = 'S09191'");
        if (res.rows.length > 0) {
            const user = res.rows[0];
            console.log('User found:', user);
            console.log(`Password match check: '${user.password}' === 'S09191' is`, user.password === 'S09191');
        } else {
            console.log('User not found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

debugUser();
