## 2024-05-19 - N+1 Query in AI Insights Endpoint
**Learning:** The `/api/ai/insights` endpoint in `backend-server/server.js` fetches group names sequentially in a `for...of` loop (`await admin.database().ref('groups/${gid}/name').get()`), causing an N+1 query performance bottleneck.
**Action:** Use `Promise.all()` to execute independent database read queries concurrently in backend endpoints, particularly when iterating over a user's joined groups or related entities.
