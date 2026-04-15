## 2025-04-06 - Replacing Native Title Attributes with Radix Tooltips
**Learning:** Native `title` attributes on interactive elements provide a delayed, inconsistently styled, and poorly accessible tooltip experience. When integrating Radix UI tooltips, it's critical to explicitly remove the native `title` attribute to prevent a "double-tooltip" effect where both the custom and native tooltips appear simultaneously, confusing users and screen readers. Additionally, tooltips must be globally wrapped in `<TooltipProvider>` to prevent application crashes due to missing context.
**Action:** Always replace native `title` attributes on icon-only buttons with Radix `<Tooltip>` components, ensuring the native attribute is removed. Use `<TooltipTrigger asChild>` to prevent invalid HTML nesting, and wrap the component tree with `<TooltipProvider>`. Utilize `useTranslation` for the tooltip and `aria-label` content.

## 2024-12-10 - Add missing ARIA labels to Icon Buttons in TransactionDetailModal

**Learning:** Missing aria-labels on purely icon-based interactive components inside modals impacts screen reader usability since context is solely visual. Missing focus-visible states on modal close and interactive buttons degrades keyboard navigation.
**Action:** Always verify all purely icon-based buttons have `aria-label` applied for accessibility and `focus-visible:ring-2` to aid keyboard accessibility.
