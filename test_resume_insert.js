require('dotenv').config();
const pool = require('./src/config/db');
const resumeModel = require('./src/models/resumeModel');


async function testInsert() {
    const testData = {
        candidate_name: 'Test Candidate',
        candidate_email: 'test@example.com',
        candidate_mobile: '1234567890',
        applied_for_designation: 'Tester',
        req_id: 'REQ001',
        experience: '2',
        previous_company: 'Test Co',
        previous_salary: 50000,
        reason_for_changing: 'Better opportunity',
        marital_status: 'Single',
        reference: 'Ref',
        address_present: 'Test Address',
        resume: 'http://example.com/resume.pdf',
        interviewer_planned: new Date().toISOString(),
        interviewer_actual: null,
        interviewer_status: 'Scheduled',
        candidate_status: 'Pending',
        joined_status: 'No'
    };

    try {
        console.log('Starting test insert...');
        const result = await resumeModel.create(testData);
        console.log('Insert result:', result);

        const countResult = await pool.query('SELECT COUNT(*) FROM resume');
        console.log('New count:', countResult.rows[0].count);
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await pool.end();
    }
}

testInsert();
