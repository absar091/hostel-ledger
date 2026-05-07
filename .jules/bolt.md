## 2024-05-07 - [Pre-instantiating Intl.DateTimeFormat in React Components]
**Learning:** Instantiating `Intl.DateTimeFormat` on every render (either explicitly or implicitly via `toLocaleTimeString` / `toLocaleDateString`) can cause measurable overhead when rendering large lists (like transactions) in React.
**Action:** Extract formatters as module-level singleton constants outside the component body whenever possible to improve list rendering performance.
