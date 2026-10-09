## 2024-05-24 - Initial creation

## 2024-05-24 - Radix Tooltips with ARIA Labels
**Learning:** In highly interactive components like modals (e.g. TransactionDetailModal), icon-only action buttons are common. Adding a simple ARIA label provides baseline accessibility, but combining it with a visual Radix UI tooltip ensures clarity for all users. It's critical to place the ARIA label directly on the button trigger itself (`<button aria-label="...">`) to satisfy screen readers, while the Tooltip component provides the visual hover cue.
**Action:** Always wrap icon-only buttons with Radix Tooltips AND provide an explicit `aria-label` attribute directly on the interactive button element when implementing micro-interactions.
