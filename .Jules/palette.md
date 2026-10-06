## 2024-05-14 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Found multiple instances where buttons containing only icons (`<button><X/></button>`) lack `aria-label`s, making them invisible or confusing to screen reader users (e.g., in `TransactionDetailModal.tsx`).
**Action:** When adding or auditing icon-only buttons, consistently ensure an `aria-label` or `title` is applied if no visible text is present to describe the action.
