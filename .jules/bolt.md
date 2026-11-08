## 2024-11-13 - [AI Insights Query Bottleneck]
**Learning:** Sequential `for...of` loops used to query Firebase Realtime Database for multiple keys (e.g., retrieving group names given a list of group IDs) cause an N+1 query problem, leading to significant latency.
**Action:** Always parallelize asynchronous database queries using `Promise.all()` over an array mapped to promises. In Node.js, concurrently assigning properties to a shared object from within resolved promises is thread-safe and prevents race conditions.
