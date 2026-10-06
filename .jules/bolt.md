## 2024-05-18 - Missing Memoization for Expensive Computation
**Learning:** Found a missing memoization on an expensive map/reduce operation in the main render loop of `GroupDetail.tsx` for calculating the top spender.
**Action:** Always verify if expensive mapping and reduction over collections in the React component body is properly memoized using `useMemo` to avoid recalculating on every re-render.
