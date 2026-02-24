const request = require('supertest');
const app = require('../server'); // Assumes server.js exports app

describe('Recovery Endpoints', () => {
  it('should be accessible without authentication (initiate-reset)', async () => {
    // We expect 400 Bad Request (missing email) or 404 (User not found)
    // But importantly, NOT 401 Unauthorized
    const res = await request(app).post('/api/2fa/initiate-reset').send({});

    if (res.status === 401) {
      throw new Error('Endpoint is protected by authentication!');
    }

    expect(res.status).not.toBe(401);
    // It should perform input validation
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Email is required/);
  });

  it('should be accessible without authentication (complete-reset)', async () => {
    const res = await request(app).post('/api/2fa/complete-reset').send({});

    if (res.status === 401) {
      throw new Error('Endpoint is protected by authentication!');
    }

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing parameters/);
  });
});
