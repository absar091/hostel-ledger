## 2024-05-18 - Concurrent Firebase Fetching in Loops
**Learning:** Sequential `await` in loops for Firebase queries (like fetching group names in `/api/ai/insights`) creates an N+1 query problem, severely increasing latency.
**Action:** Replace `for...of` loops containing `await` with `Promise.all()` over mapped arrays to execute queries concurrently. This is especially true for `server.js` and `server_fixed.js` which must be kept in sync.
