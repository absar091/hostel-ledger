1. **Optimize `/api/add-expense` Database Queries**
   - using the `replace_with_git_merge_diff` tool, replace the sequential loops fetching users and settlements in `/api/add-expense` with a single, parallel batch request.
   - Specifically, early in the `/api/add-expense` endpoint function logic (right after idempotency check), extract the required `userId`s from the `participants` and `finalPayers` provided in `req.body` directly.
   - Combine the main `groups/${groupId}` and `users/${currentUserId}` requests with all `users/${userId}` requests, group budget `budgets/${groupId}`, and `personalBudgets/${userId}` into a single `Promise.all` fetch block.
   - Use the pre-fetched user objects to extract `email`, `settlements/${groupId}`, and `personalBudgets/${userId}` later in the logic without executing new `get()` queries.
   - This eliminates up to `2 * N + 1` sequential database requests where `N` is the number of participants/payers.
   - Ensure the new logic includes a comment `// ⚡ Bolt Performance Optimization: Batched fetching of all related user data upfront` explaining the optimization.

2. **Verify Code Compiles and Tests Run**
   - using the `run_in_bash_session` tool, execute `pnpm lint` to check for syntax issues.
   - using the `run_in_bash_session` tool, execute `pnpm run build --mode development` to verify the codebase compiles successfully.
   - using the `run_in_bash_session` tool, execute `pnpm test` (or fallback testing methods if environment issues are present) to ensure no regressions were introduced.

3. **Complete Pre-Commit Steps**
   - using the `pre_commit_instructions` tool, Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

4. **Submit Pull Request**
   - using the `submit` tool, create a PR with:
     - Title: `⚡ Bolt: [Performance Improvement] Batch user data fetches in add-expense endpoint`
     - Description sections:
       - `💡 What`: Combined individual `db.ref('users/UID').get()`, `db.ref('users/UID/settlements').get()`, and budget fetches into a single `Promise.all()` batch call at the start of the `/api/add-expense` endpoint.
       - `🎯 Why`: Eliminates N+1 query problem by parallelizing data fetching instead of using sequential database requests inside array `.map` loops, significantly reducing latency and Database read volume.
       - `📊 Impact`: Reduces database read roundtrips from `O(N)` to `O(1)`, speeding up the endpoint significantly for larger groups.
       - `🔬 Measurement`: Can be measured by verifying the server latency decrease or observing Firebase profiler read count drops during expense creation.
