## 2025-03-08 - N+1 Latency with Firebase Realtime DB
**Learning:** Replacing sequential Firebase database queries in loops with Promise.all() for concurrent fetching avoids N+1 query latency problems and provides a significant measurable performance boost (~95% latency reduction observed for 20 concurrent group fetches compared to sequential).
**Action:** Whenever iterating over ids and performing .get() on Firebase RTDB, use Promise.all to fetch concurrently and an index-based for-loop to associate responses with origin ids.
