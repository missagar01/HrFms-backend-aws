require('dotenv').config();
const pool = require('./src/config/db');

async function debugUser() {
    try {
        // Check columns
        const columnsRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
        console.log('Columns in users table:', columnsRes.rows.map(r => r.column_name));

        // Check if user exists with employee_id
        const userRes = await pool.query("SELECT * FROM users WHERE employee_id = 'S09191'");
        if (userRes.rows.length > 0) {
            console.log('User found with employee_id S09191:', userRes.rows[0]);
        } else {
            console.log('User NOT found with employee_id S09191');

            // Try searching by what might be an old column if migration failed? 
            // But we saw columns above.

            // key might be case sensitive?
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

debugUser();
