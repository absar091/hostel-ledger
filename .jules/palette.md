## 2024-07-03 - Added Tooltips to TransactionDetailModal
**Learning:** Found several icon-only buttons (Share as Image, Close, Copy Reference) in `TransactionDetailModal` that were using native `title` attributes instead of consistent Radix UI tooltips, causing accessibility issues and a lack of visual cohesion.
**Action:** Replaced native `title` attributes with Radix UI `<Tooltip>` components and ensured proper ARIA labels.

## 2024-07-03 - Radix Tooltip Accessibility Context
**Learning:** When removing native `title` attributes in favor of Radix UI tooltips, the underlying element (like `<button>`) still requires an explicit `aria-label` to maintain screen reader support, as the Radix Tooltip Content is often rendered in a portal and may not be inherently associated for all screen readers without proper aria linking, especially when replacing standard OS-level title tooltips.
**Action:** Always ensure that any element wrapped in a `<TooltipTrigger>` has an `aria-label` that exactly mirrors the intended text of the tooltip content to prevent accessibility regressions.
