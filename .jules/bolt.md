## 2024-04-10 - Concurrent Firebase Realtime Database Fetching
**Learning:** In backend-server loops, fetching Firebase nodes sequentially inside a `for...of` loop causes an N+1 query problem, multiplying latency. Using `Promise.all()` to fetch nodes concurrently provides an enormous latency reduction (~95% for 20 group fetches).
**Action:** Always map loop iterations to an array of promises and `await Promise.all()` instead of `await`ing individual Firebase `get()` calls sequentially inside a loop.
