
## 2024-10-26 - Targeted Context Memoization
**Learning:** Attempting to memoize massive context providers (like FirebaseAuthContext with 30+ unmemoized functions) introduces a high risk of missing dependencies and exceeds the <50 lines optimization constraint for quick wins.
**Action:** When looking for performance wins, target smaller context providers (like SidebarContext or AuthContext) where memoizing the context value and its updater functions (using useCallback with functional state updates like `setIsOpen(prev => !prev)`) provides safe, measurable quick wins without extensive refactoring.
