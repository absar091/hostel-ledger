## 2024-05-24 - Context Hooks breaking React.memo inside list components
**Learning:** Using context hooks (`useCurrency`, `useContext`) directly inside list item components (e.g., `TimelineItem`) causes massive O(N) context subscriptions and reference instability, breaking `React.memo` and causing severe performance bottlenecks on re-renders for large lists.
**Action:** Consume the context in the parent list component (e.g., `GroupDetail`) and pass primitive values (like `currencyCode`) down to the child items as props instead.
