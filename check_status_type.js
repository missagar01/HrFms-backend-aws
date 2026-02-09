require('dotenv').config();
const pool = require('./src/config/db');

async function checkStatusType() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'status';
    `);
        console.log('Status column details:', res.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkStatusType();
