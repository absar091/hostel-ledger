const { getStatusPageHTML } = require('./utils/statusPage');
const fs = require('fs');

const dummyData = {
  version: '1.2.0',
  env: 'production',
  system: {
    uptime: 12345,
    platform: 'win32',
    release: '10.0.19045',
    memory: {
      total: 16000000000,
      free: 8000000000,
      usage: '50.00%'
    },
    cpuCount: 16,
    serverTime: new Date().toISOString()
  },
  timestamp: new Date().toISOString(),
  firebaseActive: true,
  oneSignalActive: true,
  smtpActive: false, // Simulate partial failure
  aiActive: true,
  endpoints: {
    'Core Infrastructure': {
      status: 'Operational',
      items: { health: '/health', statusDashboard: '/' }
    },
    'Communication & AI': {
      status: 'Degraded',
      items: { emailService: '/api/send-email', pushNotification: '/api/push-notify' }
    },
    'Authentication & Security': {
      status: 'Operational',
      items: { verificationRequest: '/api/verification/request' }
    }
  }
};

const html = getStatusPageHTML(dummyData);
fs.writeFileSync('/tmp/status_refined_test.html', html);
console.log('✅ HTML generated at /tmp/status_refined_test.html');
