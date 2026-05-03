## 2024-05-03 - [Pre-instantiate Intl.DateTimeFormat for performance]
**Learning:** `Intl.DateTimeFormat` (or implicitly via `toLocaleTimeString`) is computationally expensive to instantiate. Using it inside React render cycles, especially within list components that mount many times (like `TransactionItem`), can cause noticeable UI lag.
**Action:** Extract formatters outside of the React component using module-level singletons where possible.
