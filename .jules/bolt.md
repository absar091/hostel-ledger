
## 2024-05-18 - [Optimize Context Subscription in List Items]
**Learning:** Consuming context hooks directly inside frequently rendered list item components (like `TimelineItem`) causes massive O(N) context subscriptions, degrading performance and increasing unnecessary re-renders.
**Action:** Always consume context in the parent list component and pass stable values or functions down to the list items as props to optimize rendering performance.
