
## 2024-05-18 - Avoid unnecessary Provider re-renders with useMemo/useCallback
**Learning:** In React Contexts, passing an object literal directly to the `value` prop of a Provider (e.g., `<Provider value={{ state, setState }}>`) causes all consuming components to re-render whenever the Provider's parent component re-renders, even if the state values haven't changed. This is a common performance anti-pattern.
**Action:** Always wrap context value objects with `useMemo`, and ensure any functions included in the context value (like state setters) are wrapped in `useCallback` with proper functional state updates (e.g. `setIsOpen(prev => !prev)` instead of `setIsOpen(!isOpen)`). This stabilizes the context reference and prevents cascading unneeded re-renders throughout the application.
