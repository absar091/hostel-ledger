## 2025-04-06 - Replacing Native Title Attributes with Radix Tooltips
**Learning:** Native `title` attributes on interactive elements provide a delayed, inconsistently styled, and poorly accessible tooltip experience. When integrating Radix UI tooltips, it's critical to explicitly remove the native `title` attribute to prevent a "double-tooltip" effect where both the custom and native tooltips appear simultaneously, confusing users and screen readers. Additionally, tooltips must be globally wrapped in `<TooltipProvider>` to prevent application crashes due to missing context.
**Action:** Always replace native `title` attributes on icon-only buttons with Radix `<Tooltip>` components, ensuring the native attribute is removed. Use `<TooltipTrigger asChild>` to prevent invalid HTML nesting, and wrap the component tree with `<TooltipProvider>`. Utilize `useTranslation` for the tooltip and `aria-label` content.

## 2024-06-23 - Radix UI Tooltip z-index within modals
**Learning:** Radix UI `TooltipContent` components rendered via portals can appear beneath high z-index overlays like Modals (e.g. `z-[100]`), masking their visual help to the user.
**Action:** When implementing Radix UI tooltips inside modals or high z-index overlays, explicitly add a higher z-index utility class (e.g., `className="z-[110]"` directly to the `<TooltipContent>`) to ensure correct visual layering.
