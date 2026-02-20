const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'https://hostel-ledger.aarx.online',
  'https://app.hostelledger.aarx.online',
  'https://hostel-ledger.vercel.app',
  'https://hostel-ledger-absar.vercel.app'
];

function checkOrigin(origin) {
  // logic from server.js (after fix)

  if (!origin) return true;

  // Check for allowed specific origins
  if (allowedOrigins.indexOf(origin) !== -1) {
    return true;
  }

  // Dynamic checks
  // Allow any localhost origin (dev environments on different ports)
  if (origin.match(/^http:\/\/localhost:[0-9]+$/)) {
    return true;
  }

  // Allow Vercel preview deployments for the hostel-ledger project
  // Matches https://hostel-ledger-*.vercel.app
  if (/^https:\/\/hostel-ledger(-.+)?\.vercel\.app$/.test(origin)) {
    return true;
  }

  return false;
}

const testCases = [
  'https://hostel-ledger.vercel.app',
  'https://hostel-ledger-git-main.vercel.app',
  'https://hostel-ledger-123.vercel.app',
  'https://hostel-ledger-foo-bar.vercel.app',
  'https://malicious-site.vercel.app',
  'https://random-site.com',
  'http://localhost:3000'
];

console.log('--- Testing Fixed Logic ---');
testCases.forEach(origin => {
  const result = checkOrigin(origin);
  console.log(`${origin}: ${result ? 'ALLOWED' : 'DENIED'}`);
});
