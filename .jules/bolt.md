## 2025-01-20 - Pre-instantiating Intl.DateTimeFormat in React components
**Learning:** Instantiating `Intl.DateTimeFormat` (or calling `toLocaleTimeString` which does it under the hood) on every render inside highly reused list items (like `TransactionItem`) can severely degrade list rendering performance due to expensive constructor calls.
**Action:** Pre-instantiate the formatter outside the component and use `.format()` inside to eliminate the repeated overhead.
