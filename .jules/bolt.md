## $(date +%Y-%m-%d) - Memoize Small Context Providers
**Learning:** While large context providers (like Auth) are risky to memoize due to high code churn, smaller, frequently-accessed providers like `SidebarContext` are excellent targets for `useMemo` and `useCallback` to prevent unnecessary re-renders across the app.
**Action:** When identifying global performance bottlenecks, prioritize memoizing smaller context providers and their updater functions over large, monolithic providers.
