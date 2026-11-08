## 2023-10-25 - Firebase Parent/Child Query Optimization
**Learning:** In Firebase Realtime Database, fetching a parent node implicitly fetches all its child nodes, meaning sequential queries for children are redundant and create N+1 performance bottlenecks.
**Action:** Extract child data directly from the already fetched parent snapshot (e.g., `groupMeta.members`) instead of making redundant sequential queries for the children.
