## 2026-03-06 - Optimize normalizeMembers for performance
**Learning:** The `normalizeMembers` function in `src/contexts/FirebaseDataContext.tsx` is a performance-critical path. It previously used chained `.map()` calls and logged traversals causing O(N) overhead per pass.
**Action:** Consolidate object/array conversion, `isCurrentUser` property resets, and 'You'/'Group Owner' renaming logic into a single-pass loop. Avoid logging full arrays in production to reduce overhead.
