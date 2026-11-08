1. **Optimize `TransactionList` by applying `React.memo`**
   - The `TransactionList` component currently does not use `React.memo`, meaning it re-renders entirely whenever its parent components (like `Dashboard`, `GroupDetail`, `Activity`, etc.) re-render, even if the `transactions`, `groups`, or `userId` props haven't changed.
   - The parent pages already use `useMemo` heavily to calculate derived data. By wrapping `TransactionList` in `React.memo`, we can prevent expensive rendering of the entire transaction list DOM tree (which loops through the array of items) when the props remain exactly the same.
   - We'll wrap the `TransactionList` function component export in `memo()`.

2. **Add a journal entry to `.jules/bolt.md`**
   - I will document this performance insight about `TransactionList` missing `memo` while heavily relying on array mappings and derived state from parent components.

3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - Call `pre_commit_instructions` and follow them to format, lint, and run tests.

4. **Submit PR with the Bolt required format**
   - Provide a title and description according to the `Bolt` persona guidelines.
