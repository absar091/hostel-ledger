## 2024-04-24 - Group Names Fetching Loop
**Learning:** Sequential await loops on Firebase Realtime Database reads (`for...of` with `await .get()`) cause significant N+1 query latency, especially when fetching associated metadata like group names for a user's transaction history or AI insights.
**Action:** Always refactor sequential `.get()` fetches in loops into parallel `Promise.all()` arrays for independent read operations to drastically reduce latency (e.g., from O(N * latency) to O(latency)).
