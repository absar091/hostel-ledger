## 2024-05-02 - String Optimization in Filter Loops\n**Learning:** Repeatedly calling `.toLowerCase()` inside  loops creates unnecessary memory allocations and CPU overhead on every iteration.\n**Action:** Pre-calculate  before any  or  loops to optimize performance.\n
## 2024-05-02 - String Optimization in Filter Loops
**Learning:** Repeatedly calling `.toLowerCase()` inside `.filter()` loops creates unnecessary memory allocations and CPU overhead on every iteration.
**Action:** Pre-calculate `searchQuery.toLowerCase()` before any `.filter()` or `.map()` loops to optimize performance.
