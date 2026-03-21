## 2024-05-24 - Avoid Redundant Firebase Queries
**Learning:** Fetching a parent node in Firebase Realtime Database implicitly fetches all child nodes. Sequentially awaiting child node queries after fetching the parent is redundant and causes N+1 performance bottlenecks.
**Action:** Always extract child data from the already fetched parent snapshot and parallelize independent queries using `Promise.all()`.
