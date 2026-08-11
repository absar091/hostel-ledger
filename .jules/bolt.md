## 2024-05-17 - O(M*T) Array Operations on Every Render
**Learning:** Found a performance bottleneck in `GroupDetail.tsx` where an O(M*T) calculation (where M is members and T is transactions) was executed unconditionally on every render to determine the top spender.
**Action:** Always wrap expensive calculations mapping over arrays and finding derived states with `useMemo` hooks, specifying accurate dependencies. Ensure `useMemo` hooks are placed correctly before early returns to abide by React's Rules of Hooks.
