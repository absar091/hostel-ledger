# Bolt Journal

## 2024-05-21 - [Date formatting optimization]
**Learning:** React re-renders can trigger expensive localized string formatting operations.
**Action:** Always try to memoize expensive formatters like `Intl.DateTimeFormat` or localized currency formatters.
