## 2024-05-10 - Date Formatting Optimization
**Learning:** Instantiating `Intl.DateTimeFormat` (or using `toLocaleTimeString` which instantiates it internally) inside frequently rendered components or lists (like `TransactionItem.tsx`) causes significant unnecessary processing and memory allocation overhead.
**Action:** Extract `Intl.DateTimeFormat` configurations to module-level singleton constants (`const timeFormatter = new Intl.DateTimeFormat(...)`) and use their `.format()` method to avoid recreation on every render.
