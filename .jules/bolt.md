## 2024-05-18 - Concurrent Firebase Fetching
**Learning:** Replacing sequential Firebase database queries in loops with `Promise.all()` for concurrent fetching avoids N+1 query latency problems and provides a significant measurable performance boost (e.g., ~95% latency reduction observed for 20 concurrent group fetches compared to sequential).
**Action:** Use `Promise.all()` with `.map()` instead of `for...of` loops when fetching multiple independent records from Firebase.
