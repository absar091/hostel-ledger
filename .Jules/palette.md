## 2025-01-20 - Accessible tooltips for icon-only action buttons
**Learning:** In highly interactive components like modals (e.g., `TransactionDetailModal`), icon-only buttons lack inherent context. Using Radix UI Tooltips combined with explicit `aria-label`s on the trigger elements effectively serves both sighted users (with context on hover/focus) and screen reader users, without cluttering the visual design.
**Action:** Always wrap icon-only action buttons in Tooltip components and provide descriptive `aria-label`s directly on the `<button>` to ensure full accessibility coverage.
