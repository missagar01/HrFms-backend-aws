const axios = require('axios');

const API_KEY = '361011012609';
const DEVICE_SERIALS = ['E03C1CB36042AA02', 'E03C1CB34D83AA02'];
const DEVICE_API_URL = 'http://139.167.179.192:90/api/v2/WebAPI/GetDeviceLogs';

async function testAttendanceAPI() {
    const today = new Date().toISOString().split('T')[0];

    console.log('='.repeat(60));
    console.log('TESTING ATTENDANCE DEVICE API');
    console.log('='.repeat(60));
    console.log(`Date: ${today}`);
    console.log('');

    for (const serial of DEVICE_SERIALS) {
        console.log(`\n📱 Device: ${serial}`);
        console.log('-'.repeat(60));

        try {
            const response = await axios.get(DEVICE_API_URL, {
                params: {
                    APIKey: API_KEY,
                    SerialNumber: serial,
                    FromDate: today,
                    ToDate: today
                }
            });

            const logs = response.data;

            if (Array.isArray(logs)) {
                console.log(`✅ Total logs received: ${logs.length}`);

                if (logs.length > 0) {
                    console.log('\n📊 Sample logs (first 5):');
                    logs.slice(0, 5).forEach((log, idx) => {
                        console.log(`  ${idx + 1}. Employee Code: ${log.EmployeeCode}, Date: ${log.LogDate}`);
                    });

                    // Get unique employee codes
                    const uniqueEmployees = new Set(logs.map(l => String(l.EmployeeCode)));
                    console.log(`\n👥 Unique employees present: ${uniqueEmployees.size}`);
                    console.log('Employee codes:', Array.from(uniqueEmployees).slice(0, 10).join(', '));
                } else {
                    console.log('⚠️  No logs found for today');
                }
            } else {
                console.log('❌ Response is not an array:', typeof logs);
                console.log('Response:', JSON.stringify(logs).substring(0, 200));
            }
        } catch (error) {
            console.log(`❌ Error fetching logs: ${error.message}`);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data:`, error.response.data);
            }
        }
    }

    console.log('\n' + '='.repeat(60));
}

testAttendanceAPI();
