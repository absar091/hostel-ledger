## 2026-10-11 - Add Tooltips to Collapsed Sidebar Items
**Learning:** Found that the sidebar relies solely on `title` attributes when collapsed, which are inaccessible, delayed, and inconsistent across browsers.
**Action:** Replaced native `title` attributes with Radix UI `Tooltip` components on navigation links, profile icon, logout button, and the toggle button for the collapsed state of the sidebar. This improves accessibility and discoverability.
