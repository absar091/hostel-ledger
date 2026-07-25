## 2024-03-24 - Context hook in large lists
**Learning:** Using context hooks (like `useCurrency`) inside list items (like `TimelineItem`) creates a subscription for every single item. In large lists, this can cause significant rendering overhead even if the context value is memoized.
**Action:** Pass stable context values (like `formatAmount`) down as props from the parent list component to the individual items instead of having each item subscribe to the context.
