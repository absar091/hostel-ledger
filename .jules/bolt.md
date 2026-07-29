
## 2024-07-29 - Context Subscription in Lists
**Learning:** In React, rendering large lists (like transaction ledgers) where each item directly consumes a global context (like `useCurrency`) causes massive O(N) context subscriptions, degrading performance significantly.
**Action:** Instead of list items consuming context, consume the context in the parent list component and pass down the stable values or functions (e.g., `formatAmount`) as props.
