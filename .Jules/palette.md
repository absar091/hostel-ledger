## 2024-03-20 - [Tooltip State Management in Collapsible Sidebars]
**Learning:** When conditionally rendering tooltips for responsive/collapsible sidebars based on `isOpen` state, conditionally wrapping elements (e.g. `isOpen ? <Button/> : <Tooltip><Button/></Tooltip>`) can destroy and re-create the component tree, leading to loss of focus.
**Action:** Always unconditionally wrap the trigger in `<Tooltip>` and use the `open` prop (e.g., `open={isOpen ? false : undefined}`) to programmatically disable the popover when it shouldn't appear, ensuring a stable React component tree.
