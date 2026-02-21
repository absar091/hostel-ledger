const request = require('supertest');
const app = require('../server'); // Assumes server.js exports app

describe('2FA Endpoints', () => {
  it('should return 200 OK for /api/2fa/status', async () => {
    const res = await request(app).get('/api/2fa/status');
    if (res.status !== 200) {
      console.error('Status check failed:', res.status, res.body);
    }
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 401 Unauthorized for /api/2fa/setup without token', async () => {
    const res = await request(app).post('/api/2fa/setup');
    if (res.status === 404) {
      console.error('Endpoint not found! Route registration issue.');
    }
    expect(res.status).toBe(401);
  });
});
