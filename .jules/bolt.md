## 2024-05-14 - Parallelize Firebase Realtime Database Reads
**Learning:** Sequential `await` in loops for Firebase reads creates a significant N+1 query bottleneck. While Firebase SDK is efficient, network latency per request adds up linearly when fetching related data (like group names for a user's groups).
**Action:** Always use `Promise.all` to fetch multiple independent nodes concurrently from Firebase Realtime Database to minimize total network turnaround time.
