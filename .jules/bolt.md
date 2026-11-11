## 2025-02-27 - [Memoizing FirebaseAuthContext value]
**Learning:** The root authentication context (`FirebaseAuthContext.tsx`) passed a new object instance `{ user, isLoading, ... }` on every single render as the provider value, which can trigger cascading re-renders in all consumers across the React tree. Adding `useMemo` and ignoring exhaustive deps for unchanged functions prevents this.
**Action:** When inspecting large Context Providers in React, check if the `value` prop is an inline object. If it is, wrap it in `useMemo` with only the primitive/state variables as dependencies.
