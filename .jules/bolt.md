## 2025-04-11 - Optimize Firebase Loops
**Learning:** Sequential await loops for Firebase RTDB child nodes cause severe N+1 query latency issues when iterating over lists like user groups.
**Action:** Always replace `for...of` loops that contain `await db.ref(...).get()` with concurrent fetch arrays and resolve them simultaneously using `Promise.all`.
