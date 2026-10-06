## 2024-12-06 - Sidebars require shared TooltipProviders
**Learning:** When conditionally rendering numerous Tooltips inside responsive sidebars (where labels are hidden on collapse), individual Tooltips can cause delay inconsistencies or redundant DOM nodes. Radix UI handles adjacent tooltips perfectly when wrapped by a shared TooltipProvider.
**Action:** Always wrap the entire parent container (like `<aside>`) in a single `<TooltipProvider>` rather than wrapping each individual item.
