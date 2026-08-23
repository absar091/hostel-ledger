## 2024-05-20 - Accessible tooltips in sidebar

**Learning:** When replacing HTML `title` attributes with Radix UI Tooltips on icon-only buttons (like in the collapsed sidebar), it provides immediate visual feedback instead of a native tooltip delay and is more accessible. A critical constraint is that conditionally showing the tooltip based on state (e.g. `isOpen ? hidden : ""`) must be done on the `TooltipContent` visually, because conditionally removing the `Tooltip` altogether while leaving the `TooltipTrigger` causes a11y issues.

**Action:** Replace `title` attributes on icon-only buttons with Radix UI `<Tooltip>` components wrapped in a `<TooltipProvider delayDuration={0}>` for better UX/a11y.
