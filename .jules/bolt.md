## 2024-05-24 - Context Value Memoization
**Learning:** The `FirebaseAuthContext` was passing an inline object directly to its Provider's `value` prop, which was causing the object to be recreated on every render of the provider, leading to unnecessary re-renders of all consuming components throughout the application.
**Action:** Always wrap Context Provider `value` objects in `useMemo` when they contain multiple state variables or functions to prevent widespread performance bottlenecks.
## 2024-05-24 - Search Input Debouncing
**Learning:** Frequent state updates from text inputs (`onChange`) directly tied to complex `useMemo` filtering functions (like in `Groups.tsx` and `Activity.tsx`) can cause noticeable UI lag, especially with large datasets, because the filtering logic executes on every keystroke.
**Action:** Always wrap search input state in a debounce hook (like `useDebounce(searchQuery, 300)`) before using it in expensive dependency arrays or filtering functions.
