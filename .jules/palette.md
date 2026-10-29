## 2024-05-20 - Replace native title attributes with accessible Tooltips
**Learning:** Native `title` attributes on buttons, especially those that are icon-only like the Sidebar and BottomNav, cause accessibility issues (double tooltips with custom ones, inconsistent styling, and poor screen reader experience).
**Action:** Replaced native `title` attributes with Radix UI Tooltip components on Sidebar navigation items, user profile button, and logout button, ensuring better consistency, customizability and preserving the `aria-label` attributes for screen readers. Also explicitly added `aria-label` for mobile buttons in BottomNav.

## 2024-05-20 - Accessible tooltips and conditional display
**Learning:** Native `title` attributes cause poor screen reader experiences and double tooltips. However, when migrating to Radix UI Tooltips on togglable elements (like a collapsible Sidebar), leaving the tooltip active when the sidebar is expanded creates spurious hover events.
**Action:** When replacing native `title` attributes on collapsible/togglable sidebars with Radix UI `<Tooltip>`, conditionally disable the tooltip using the `open` prop on the root `<Tooltip>` component (e.g. `<Tooltip open={isOpen ? false : undefined}>`) to ensure the tooltip only appears when the sidebar is collapsed and falls back to default hover behavior otherwise.
