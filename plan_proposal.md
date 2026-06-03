1. **Identify the Bottleneck**:
   In `src/pages/GroupDetail.tsx`, the `TimelineItem` component is rendered in a list mapping over the `transactions` array (around line 608). Inside the `map` callback, for every transaction, there are multiple linear searches (e.g., `group.members.find(m => m.id === p.id)`) to resolve participant and payer names. Since `transactions` can be large and `group.members` can also be sizable, this results in O(T * P * M) operations during render, where T is the number of transactions, P is the number of participants per transaction, and M is the number of members in the group. This causes unnecessary re-renders and degrades frontend performance.

2. **Implement the Solution**:
   Create a memoized `membersMap` before the `transactions.map` loop to change the O(M) lookup to an O(1) lookup.
   - Inject the `membersMap` computation via `useMemo` right before the early returns or in the hooks section.
   - Replace all instances of `group.members.find(m => m.id === ...)` inside the `transactions.map` block with `membersMap[...]`.

   *Changes in `src/pages/GroupDetail.tsx`:*
   - Add the following `useMemo` block near other memoized values (e.g., around line 125):
     ```tsx
       const membersMap = useMemo(() => {
         if (!group?.members) return {};
         return Object.fromEntries(group.members.map((m: any) => [m.id, m]));
       }, [group?.members]);
     ```
   - Update the mapping block around line 618:
     Replace `const member = group.members.find(m => m.id === p.id);` with `const member = membersMap[p.id];`.
     Replace `const member = group.members.find((m: { id: any; }) => m.id === item.paidBy);` with `const member = membersMap[item.paidBy];`.
     Replace `const member = group.members.find((m: { id: any; }) => m.id === p.id); // Valid member name` with `const member = membersMap[p.id];`.

3. **Complete pre-commit steps**:
   Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

4. **Verify the Fix**:
   - Run `pnpm lint` and `pnpm test` to verify the codebase remains intact.
   - Start the development server (`pnpm dev &`) and test the Group Detail page to ensure transaction participant names are still correctly displayed.

5. **Submit a Pull Request**:
   Use the `submit` tool to create a commit and PR, following Bolt's persona guidelines for title and description.
