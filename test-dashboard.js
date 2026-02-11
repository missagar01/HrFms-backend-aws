require('dotenv').config();
const pool = require('./src/config/db');
const dashboardService = require('./src/services/dashboardService');
const fs = require('fs');

async function test() {
    const client = await pool.connect();
    try {
        console.log('Querying for employee ID...');
        const result = await client.query("SELECT id, employee_id FROM users LIMIT 1");

        if (result.rows.length === 0) {
            fs.writeFileSync('test_result.txt', 'No users found');
            return;
        }

        const employeeId = result.rows[0].employee_id;
        const userId = result.rows[0].id;
        console.log(`Testing with employee ID: ${employeeId}, User ID: ${userId}`);

        const month = '2026-02';
        const statsMonth = await dashboardService.getEmployeeDashboardStats(userId, employeeId, month);
        fs.writeFileSync('test_result.txt', JSON.stringify(statsMonth, null, 2));
        console.log('Success');

    } catch (err) {
        console.error('ERROR:', err);
        fs.writeFileSync('test_result.txt', `ERROR: ${err.message}\n${err.stack}`);
    } finally {
        client.release();
        process.exit(0);
    }
}

test();
