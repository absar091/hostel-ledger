const request = require('supertest');
const app = require('../server');

describe('Transaction Alert Endpoint', () => {
  it('should return 410 Gone for /api/send-transaction-alert', async () => {
    // This test verifies that the endpoint is deprecated and returns 410 Gone
    // instead of 401 Unauthorized (which would mean it's still active but secured)
    // or 200 OK (which would mean it's still active and vulnerable if auth bypassed)

    const res = await request(app)
      .post('/api/send-transaction-alert')
      .send({
        email: 'test@example.com',
        name: 'Test',
        transactionType: 'expense',
        amount: 100,
        groupName: 'Test Group',
        date: '2024-01-01',
        description: 'Test'
      });

    // We expect 410 Gone because we explicitly deprecated it.
    // If it returns 404, it means it's completely removed (also fine, but we prefer explicit 410).
    // If it returns 401, it means it's still protected by auth but not publicly deprecated (which is what we want to fix).

    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/deprecated/i);
  });
});
