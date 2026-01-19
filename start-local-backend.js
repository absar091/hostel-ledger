// Temporary local backend for testing
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for all origins during testing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Local test backend is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Local Hostel Ledger Test API',
    version: '1.0.0-local',
    endpoints: {
      health: '/health',
      sendVerification: '/api/send-verification'
    },
    timestamp: new Date().toISOString()
  });
});

// Mock verification email endpoint
app.post('/api/send-verification', (req, res) => {
  const { email, code, name } = req.body;
  
  console.log('📧 Mock verification email request:');
  console.log(`   Email: ${email}`);
  console.log(`   Code: ${code}`);
  console.log(`   Name: ${name}`);
  
  // Simulate email sending
  setTimeout(() => {
    res.json({
      success: true,
      messageId: 'mock-' + Date.now(),
      message: 'Mock verification email sent (check console for details)'
    });
  }, 1000);
});

app.listen(PORT, () => {
  console.log(`🚀 Local test backend running on http://localhost:${PORT}`);
  console.log(`📧 This is a MOCK backend - emails will be logged to console`);
  console.log(`🔧 Use this for testing while fixing the production backend`);
  console.log(`\n💡 To use this backend, update your .env file:`);
  console.log(`VITE_API_URL=http://localhost:${PORT}`);
});