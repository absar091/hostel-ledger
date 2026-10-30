## 2024-05-15 - Memoizing State Updaters in Contexts
**Learning:** Using functional state updates (e.g., `setIsOpen(prev => !prev)`) inside `useCallback([])` allows context state updaters to remain stable without depending on the state variable, preventing unnecessary re-renders of context consumers.
**Action:** When memoizing context functions, always prefer functional state updates inside `useCallback` to maintain a stable function reference.
