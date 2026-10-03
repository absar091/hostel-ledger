## 2023-10-27 - Radix UI Tooltip Providers in loops
**Learning:** When replacing native `title` tooltips with Radix UI Tooltips in a `.map()` loop, adding a `<TooltipProvider>` for each item is slightly unoptimized and verbose.
**Action:** A single `<TooltipProvider>` can be placed higher up the tree (e.g. at the component or app root) to manage all tooltips inside it, saving DOM nodes and ensuring shared delay configuration.
