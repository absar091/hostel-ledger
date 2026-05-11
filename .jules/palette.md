## 2025-04-06 - Replacing Native Title Attributes with Radix Tooltips
**Learning:** Native `title` attributes on interactive elements provide a delayed, inconsistently styled, and poorly accessible tooltip experience. When integrating Radix UI tooltips, it's critical to explicitly remove the native `title` attribute to prevent a "double-tooltip" effect where both the custom and native tooltips appear simultaneously, confusing users and screen readers. Additionally, tooltips must be globally wrapped in `<TooltipProvider>` to prevent application crashes due to missing context.
**Action:** Always replace native `title` attributes on icon-only buttons with Radix `<Tooltip>` components, ensuring the native attribute is removed. Use `<TooltipTrigger asChild>` to prevent invalid HTML nesting, and wrap the component tree with `<TooltipProvider>`. Utilize `useTranslation` for the tooltip and `aria-label` content.

## 2024-05-11 - Dashboard Icon Button Accessibility
**Learning:** Icon-only buttons used for widget actions (like budget refresh) need explicit `aria-label`s and tooltips. Relying only on visual context excludes screen reader users and users who do not intuitively understand the icon.
**Action:** Always wrap icon-only buttons in Radix Tooltips with a descriptive `aria-label` on the trigger button to ensure an accessible, pleasant user experience.
