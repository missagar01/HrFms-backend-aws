require('dotenv').config();
const pool = require('./src/config/db');
const fs = require('fs');

async function inspectSchema() {
    const client = await pool.connect();
    const tables = ['users', 'leave_request', 'request', 'ticket_book', 'plant_visitor'];
    let output = '';

    try {
        for (const table of tables) {
            output += `\n--- Schema for ${table} ---\n`;
            const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
            res.rows.forEach(row => {
                output += `${row.column_name}: ${row.data_type}\n`;
            });
        }
    } catch (err) {
        output += `ERROR: ${err.message}\n`;
    } finally {
        client.release();
        fs.writeFileSync('schema_output.txt', output);
        console.log('Schema inspection done.');
        process.exit(0);
    }
}

inspectSchema();
