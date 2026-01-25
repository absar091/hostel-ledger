// Comprehensive API verification script for Hostel Ledger
// Run with: node verify-api.js
const API_URL = 'http://localhost:3000';

// Mock authentication header (for testing, we'll assume the server is in development mode or has a bypass)
// NOTE: Since the real server uses Firebase Auth middleware, this script might need a valid token.
// For verification, we'll check if the endpoints exist and return correct error codes if unauthorized,
// or use a test bypass if implemented.

async function verifyFinancialEndpoints() {
    console.log('🚀 Starting Financial API Verification...');
    console.log('📍 Target:', API_URL);

    const testCases = [
        {
            name: 'Health Check',
            path: '/health',
            method: 'GET',
            expectedStatus: 200
        },
        {
            name: 'Add Expense (Unauthorized)',
            path: '/api/add-expense',
            method: 'POST',
            body: { groupId: 'test', amount: 100 },
            expectedStatus: 401 // Should be unauthorized without token
        },
        {
            name: 'Record Payment (Unauthorized)',
            path: '/api/record-payment',
            method: 'POST',
            body: { groupId: 'test', amount: 50 },
            expectedStatus: 401
        },
        {
            name: 'Update Wallet (Unauthorized)',
            path: '/api/update-wallet',
            method: 'POST',
            body: { amount: 50, type: 'add' },
            expectedStatus: 401
        },
        {
            name: 'Member Cleanup (Authorized/Internal)',
            path: '/api/cleanup-temp-members',
            method: 'POST',
            body: {},
            expectedStatus: 200 // This endpoint doesn't use the same auth middleware in the implementation
        }
    ];

    for (const tc of testCases) {
        console.log(`\n🧪 Testing: ${tc.name}`);
        try {
            const options = {
                method: tc.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (tc.body) options.body = JSON.stringify(tc.body);

            const response = await fetch(`${API_URL}${tc.path}`, options);
            const status = response.status;

            let data;
            try {
                data = await response.json();
            } catch (e) {
                data = 'Non-JSON response';
            }

            if (status === tc.expectedStatus) {
                console.log(`✅ Passed: Received status ${status}`);
                if (tc.name === 'Member Cleanup (Authorized/Internal)') {
                    console.log(`📊 Cleanup Result: Removed ${data.removedCount} members`);
                }
            } else {
                console.log(`❌ Failed: Expected ${tc.expectedStatus}, but got ${status}`);
                console.log('📄 Response:', data);
            }
        } catch (error) {
            console.error(`💥 Error testing ${tc.name}:`, error.message);
        }
    }

    console.log('\n🏁 Verification completed.');
}

verifyFinancialEndpoints();
