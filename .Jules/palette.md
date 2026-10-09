## 2025-03-08 - Modal Close Buttons Missing Accessible Names
**Learning:** Found that custom modal components (like `TransactionDetailModal`) often contain icon-only buttons (like `X` for close or custom SVG icons for sharing/copying) that lack accessible names, making them difficult for screen reader users to identify.
**Action:** Always verify that interactive elements, especially icon-only buttons within modals and sheets, have appropriate `aria-label` attributes to describe their functionality.
