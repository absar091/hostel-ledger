1. **Optimize Recent Activity rendering in `src/pages/Dashboard.tsx`:**
   - In `src/pages/Dashboard.tsx`, the `useMemo` block that calculates `todayTransactions`, `yesterdayTransactions`, and `olderTransactions` currently loops over all transactions via `allTransactions.forEach`.
   - Modify the implementation to use a `for...of` loop over `allTransactions`.
   - Add an early `break` condition: Since `allTransactions` is pre-sorted newest-first, and the dashboard only displays a maximum of 3 transactions in total, we can break out of the loop once `todayTransactions.length + yesterdayTransactions.length + olderTransactions.length === 3`.

2. **Run format, lint and test checks:**
   - Run `pnpm format`, `pnpm lint`, and `pnpm test` to ensure that no existing functionality is broken.

3. **Complete pre-commit steps:**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

4. **Submit PR:**
   - Submit the PR with the required `⚡ Bolt: [performance improvement]` title and format.
