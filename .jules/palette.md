## 2025-04-06 - Replacing Native Title Attributes with Radix Tooltips
**Learning:** Native `title` attributes on interactive elements provide a delayed, inconsistently styled, and poorly accessible tooltip experience. When integrating Radix UI tooltips, it's critical to explicitly remove the native `title` attribute to prevent a "double-tooltip" effect where both the custom and native tooltips appear simultaneously, confusing users and screen readers. Additionally, tooltips must be globally wrapped in `<TooltipProvider>` to prevent application crashes due to missing context.
**Action:** Always replace native `title` attributes on icon-only buttons with Radix `<Tooltip>` components, ensuring the native attribute is removed. Use `<TooltipTrigger asChild>` to prevent invalid HTML nesting, and wrap the component tree with `<TooltipProvider>`. Utilize `useTranslation` for the tooltip and `aria-label` content.

## 2024-10-29 - Removing Double Tooltips
**Learning:** Native `title` HTML attributes alongside custom tooltips create a double-tooltip effect that confuses screen readers and clutters the UI visually when hovering.
**Action:** When replacing native HTML `title` attributes with custom UI tooltips (like Radix UI `<Tooltip>`), ensure the native attribute is completely removed and we fall back to an explicit `aria-label` for screen readers.
