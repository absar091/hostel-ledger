## 2025-03-25 - Parallelizing AI Insights Database Queries
**Learning:** The `/api/ai/insights` endpoint suffered from an N+1 query issue where group names were fetched sequentially. Replacing the `for...of` loop with `Promise.all` yields an ~10x speedup for users in 10 groups.
**Action:** Always fetch independent database nodes in parallel using `Promise.all` in Firebase RTDB to avoid high latency overheads.
