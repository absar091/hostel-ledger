## 2024-05-14 - Replacing native titles with Radix Tooltips
**Learning:** Native `title` attributes on interactive components create inconsistent UI experiences and should be replaced with custom accessible tooltips. Wrapping elements directly in `<Tooltip>` causes JSX nesting issues if `<TooltipTrigger>` isn't correctly structured or doesn't use `asChild`.
**Action:** When replacing native tooltips, explicitly wrap the `<button>` with `<Tooltip><TooltipTrigger asChild>... </TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>` and transfer the text to `aria-label` to preserve accessibility on icon-only buttons.
## 2024-05-14 - Ensuring all icon-only buttons are accessible
**Learning:** It is easy to miss adjacent components when fixing specific parts of the UI. The onClose button in the TransactionDetailModal lacked an `aria-label` despite only using an icon.
**Action:** Always scan the entire component, or at least the adjacent code block, for any remaining icon-only buttons to ensure they have the proper `aria-label` tags, adhering strictly to the UX boundary.
