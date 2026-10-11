## 2025-02-12 - Icon-only Buttons Missing Accessibility Labels in Transaction Modal
**Learning:** Found that custom icon-only actions within custom components (like TransactionDetailModal) are missing `aria-label`s, breaking accessibility for screen-readers on buttons like "Close", "Copy Reference", and "View on Maps".
**Action:** When working on modals and custom actions, ensure that every `<button>` without visible text contains an explicit `aria-label` explaining its function.
