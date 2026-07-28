## 2024-07-28 - Optimizing React Context Subscriptions in Lists
**Learning:** Consuming context (like `useCurrency`) directly inside a highly repeated list component (`TimelineItem`) causes massive O(N) context subscriptions. This forces React to register a listener for every item, blocking the main thread during render.
**Action:** Always consume context in the parent list component (e.g., `GroupDetail`) and pass stable values or functions down to the list items as props.
