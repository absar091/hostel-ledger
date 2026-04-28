## 2024-05-18 - Replacing Native Titles with Accessible Tooltips
**Learning:** When migrating native `title` attributes on interactive icon-only elements to accessible Radix UI `<Tooltip>` components, any corresponding E2E testing selectors (like in Playwright) that rely on `[title='...']` will timeout and fail.
**Action:** Always run a global `grep` for the `title` text or `title=` within test directories (`src/components/__tests__`, `e2e`, etc.) before completing the migration, and update these selectors to target the new `aria-label` instead.
