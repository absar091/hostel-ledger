## 2024-05-18 - Radix UI TooltipProvider in Lists
**Learning:** In shadcn/ui (Radix), wrapping individual elements within a large `.map()` list with `<TooltipProvider>` prevents shared delay state and scales context initialization linearly with list size (O(N)), degrading render performance in dense components like `TransactionList`.
**Action:** When rendering `Tooltip`s in lists, rely on a single `<TooltipProvider>` higher up the component tree (like in `App.tsx`) to handle state globally, and only wrap the items in `<Tooltip>`.
