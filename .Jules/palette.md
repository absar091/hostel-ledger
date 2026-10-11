## 2025-02-18 - Missing ARIA Labels in Transaction Detail Modal
**Learning:** Found multiple icon-only action buttons in the `TransactionDetailModal` component ("Share as Image", "Close", "Copy Reference") that lack `aria-label` attributes. This presents a critical accessibility barrier for screen reader users as these interactable elements are completely opaque without visible text labels.
**Action:** Always add explicit `aria-label` attributes to any icon-only button to ensure semantic meaning is conveyed to assistive technologies.
