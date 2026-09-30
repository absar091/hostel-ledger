## 2024-05-20 - Replace native title tooltips with Radix UI Tooltip
**Learning:** Using native HTML `title` attributes on interactive components (like navigation icons and avatar buttons) creates inconsistent, slow-to-appear, unstyleable tooltips that can duplicate custom application tooltips.
**Action:** Always replace the native `title` attribute with a Radix UI `<Tooltip>` component on interactive elements. Ensure to wrap elements in a `<TooltipProvider>` and preserve screen-reader accessibility by maintaining the text string in a native `aria-label` attribute on the element itself.
