## 2024-03-29 - Parallelize Firebase RTDB Queries
**Learning:** Using sequential `await` inside `for...of` loops causes severe N+1 performance bottlenecks when fetching from Firebase Realtime Database.
**Action:** Always map over arrays with `async` functions and wrap with `Promise.all()` to fetch data concurrently, as JS event loops handle non-blocking concurrent network requests much faster.
