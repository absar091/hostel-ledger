# Bolt's Journal - Critical Learnings

## 2024-05-22 - Initial Setup
**Learning:** Journal file was missing.
**Action:** Created journal file to track performance learnings.

## 2024-05-22 - React Context Optimization
**Learning:** The `FirebaseDataContext` has a massive `value` object that is memoized, but it includes many functions that are recreated on every render because they are defined inside the component scope without `useCallback`.
**Action:** Wrap all context functions in `useCallback` to prevent unnecessary re-renders of consumers. However, `useMemo` already wraps the return value. The bigger issue is that `groups` and `transactions` updates will trigger re-renders for ALL consumers, even if they only care about `addExpense`.
**Refinement:** Splitting the context into `FirebaseDataStateContext` and `FirebaseDataDispatchContext` would be better, but that's a larger architectural change.
**Opportunity:** `TransactionItem` is already memoized with `React.memo`. `Dashboard` component is quite large.
**Observation:** `TransactionList` maps over transactions and renders `TransactionItem`. If `transactions` array reference changes (which happens on every new transaction or load), the entire list re-renders. `TransactionItem` is memoized, so if props are stable, it skips re-render.
**Bottleneck:** In `FirebaseDataContext.tsx`, `setTransactions` is called with a new array reference every time the listener fires.
**Optimization:** Ensure `TransactionItem` props are stable.
**Discovery:** In `Dashboard.tsx`, `TransactionList` is passed `groups={groups}`. `groups` changes whenever any group data changes. This causes `TransactionList` to re-render. Inside `TransactionList`, it passes `groups` to `TransactionItem`.
`TransactionItem` props: `groups={groups}`.
Since `groups` reference changes, `TransactionItem` re-renders even if the transaction itself hasn't changed.
**Hypothesis:** `TransactionItem` depends on `groups` just to find the group name: `const transactionGroup = groups.find((g) => g.id === transaction.groupId);`.
Passing the entire `groups` array to every `TransactionItem` breaks memoization when *any* group updates.
**Solution:** Pass `groupName` (or just the specific group object if stable, but string is better) to `TransactionItem` instead of the whole `groups` array. Or let `TransactionList` do the lookup.
**Plan:** Modify `TransactionItem` to accept `groupName` instead of `groups`. Update `TransactionList` to perform the lookup and pass the string.
