## 2024-05-24 - Context Performance Optimization
**Learning:** Chained `.map()` calls and logging traversals in React Context values cause O(N) overhead per pass, significantly impacting performance when rendering contexts handling dynamic lists.
**Action:** Consolidate array/object conversions and conditional transformations into a single-pass loop within Context providers to reduce O(N) overhead.
