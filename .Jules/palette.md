## 2026-10-09 - Accessible Tooltips on Icon-Only Action Buttons
**Learning:** Icon-only action buttons (like those found in chat input fields) present accessibility barriers if they lack `aria-label` attributes for screen readers and visible tooltips for sighted users.
**Action:** When implementing or refactoring icon-only action buttons, always ensure they are accompanied by a descriptive `aria-label` attribute on the button element itself, and wrapped in Radix `<Tooltip>` components (`TooltipProvider`, `Tooltip`, `TooltipTrigger asChild`, `TooltipContent`) to provide a visible hover state.
