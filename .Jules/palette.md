## 2024-10-12 - Combining Tooltips with ARIA Labels
**Learning:** Radix UI tooltips provide visual context for sighted users on icon-only buttons, but they do not automatically handle screen reader accessibility. An explicit `aria-label` must still be added to the trigger button itself.
**Action:** Whenever adding an icon-only action button, verify it has both an `aria-label` (for screen readers) and a visual `<Tooltip>` (for sighted users relying on hover/focus).
