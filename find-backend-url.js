// Script to help find the correct backend URL
const possibleUrls = [
  'https://hostel-ledger-backend.vercel.app',
  'https://hostel-ledger-backend-git-main-absar091.vercel.app',
  'https://hostel-ledger-backend-absar091.vercel.app',
  'https://backend-server-absar091.vercel.app',
  'https://backend-server.vercel.app',
  'https://hostel-ledger-api.vercel.app',
  'https://hostel-ledger-email-api.vercel.app'
];

async function testUrls() {
  console.log('🔍 Testing possible backend URLs...\n');
  
  for (const url of possibleUrls) {
    try {
      console.log(`Testing: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${url}/health`, {
        signal: controller.signal,
        method: 'GET'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ FOUND WORKING BACKEND: ${url}`);
        console.log(`   Response: ${data.message}`);
        console.log(`   Timestamp: ${data.timestamp}\n`);
        
        // Test the verification endpoint too
        try {
          const testResponse = await fetch(`${url}/api/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@example.com',
              code: '123456',
              name: 'Test User'
            })
          });
          
          if (testResponse.ok) {
            console.log(`✅ Verification endpoint also working!`);
          } else if (testResponse.status === 429) {
            console.log(`⚠️  Verification endpoint rate limited (expected)`);
          } else {
            console.log(`❌ Verification endpoint failed: ${testResponse.status}`);
          }
        } catch (e) {
          console.log(`❌ Verification endpoint error: ${e.message}`);
        }
        
        console.log(`\n🎯 UPDATE YOUR .env FILE:`);
        console.log(`VITE_API_URL=${url}\n`);
        return;
      } else {
        console.log(`❌ Status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`❌ Timeout (5s)`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    console.log('');
  }
  
  console.log('❌ No working backend URL found!');
  console.log('\n💡 Possible solutions:');
  console.log('1. Check your Vercel dashboard for the correct URL');
  console.log('2. Make sure the backend is deployed');
  console.log('3. Check if the backend project name is different');
}

testUrls();