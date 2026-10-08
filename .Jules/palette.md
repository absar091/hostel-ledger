## 2026-10-08 - [Tooltips for Icon Buttons]
**Learning:** Adding accessible Tooltips from Radix UI directly improves usability on icon-only buttons without labels, but it's important to remember wrapping the entire element in `<TooltipProvider>` can cause unexpected DOM issues if not handled carefully, and you should ensure aria-labels are still on the actual button element for screen readers, not just the tooltip.
**Action:** Always add aria-labels to the `<Button>` component itself when using `size="icon"` even if a `<Tooltip>` wrapper provides visual context.
