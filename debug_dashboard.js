require('dotenv').config();
const pool = require('./src/config/db');

async function debugDashboard() {
    const client = await pool.connect();
    try {
        console.log('Checking tables...');

        const tables = ['users', 'leave_request', 'request', 'ticket_book', 'resume', 'plant_visitor'];
        for (const table of tables) {
            try {
                await client.query(`SELECT 1 FROM ${table} LIMIT 1`);
                console.log(`Table '${table}' exists.`);
            } catch (err) {
                console.error(`Table '${table}' check failed:`, err.message);
            }
        }

        console.log('\nRunning queries from dashboardService...');

        // 1. Summary Query
        try {
            const ATTRITION_PATTERN = 'resign|left|terminated|separate';
            await client.query(`
            SELECT
            COUNT(*)::int AS total_employees,
            COUNT(*) FILTER (WHERE LOWER(status) = 'active')::int AS active_employees,
            COUNT(*) FILTER (
                WHERE status IS NOT NULL
                AND status ~* '${ATTRITION_PATTERN}'
            )::int AS resigned_employees
            FROM users
        `);
            console.log('Summary Query: OK');
        } catch (err) { console.error('Summary Query Failed:', err.message); }

        // 2. Leave Stats Query
        try {
            await client.query(`
            SELECT
            COUNT(*)::int AS total_leaves
            FROM leave_request
        `);
            console.log('Leave Stats Query: OK');
        } catch (err) { console.error('Leave Stats Query Failed:', err.message); }

        // 3. Travel Stats Query
        try {
            await client.query(`
            SELECT
            COUNT(*)::int AS total_travels
            FROM request
        `);
            console.log('Travel Stats Query: OK');
        } catch (err) { console.error('Travel Stats Query Failed:', err.message); }

        // 4. Ticket Stats Query
        try {
            await client.query(`
            SELECT
            COUNT(*)::int AS total_tickets
            FROM ticket_book
        `);
            console.log('Ticket Stats Query: OK');
        } catch (err) { console.error('Ticket Stats Query Failed:', err.message); }

        // 5. Resume Stats Query
        try {
            await client.query(`
            SELECT
            COUNT(*)::int AS total_candidates
            FROM resume
        `);
            console.log('Resume Stats Query: OK');
        } catch (err) { console.error('Resume Stats Query Failed:', err.message); }

        // 6. Visitor Stats Query
        try {
            await client.query(`
            SELECT
            COUNT(*)::int AS total_visitors
            FROM plant_visitor
        `);
            console.log('Visitor Stats Query: OK');
        } catch (err) { console.error('Visitor Stats Query Failed:', err.message); }

        // 7. Active Employees Query (checking employee_id)
        try {
            await client.query("SELECT employee_id FROM users WHERE LOWER(status) = 'active' LIMIT 1");
            console.log('Active Employees Query: OK');
        } catch (err) { console.error('Active Employees Query Failed:', err.message); }

    } catch (err) {
        console.error('General Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

debugDashboard();
