## 2024-05-24 - Parallelize Firebase Fetching
**Learning:** When fetching multiple child nodes (e.g., groups by IDs) from Firebase Realtime Database in Node.js, using sequential `for...of` loops causes an N+1 query bottleneck because each request waits for the previous one to finish.
**Action:** Use `Promise.all()` to parallelize multiple independent Firebase queries mapped over an array, drastically reducing network round-trip delays without blocking the JavaScript single thread.
