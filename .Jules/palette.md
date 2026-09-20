## 2023-10-27 - Sidebar Tooltip Pattern
**Learning:** Native `title` attributes on collapsed navigation menus provide delayed and poorly-styled UX. Replacing them with custom UI tooltips is a high-value micro-improvement, but requires careful conditional rendering to avoid duplicating labels when the menu is expanded.
**Action:** Always verify that Radix `<TooltipContent>` conditionally renders (e.g., `{!isOpen && <TooltipContent>...}`) rather than unconditionally rendering an empty string when replacing native titles in responsive layouts.
