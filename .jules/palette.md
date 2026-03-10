## 2026-03-10 - Add aria-current to active navigation links
**Learning:** Found that visual active states in navigation menus (like Sidebar or BottomNav) are not automatically announced to screen readers. Relying solely on colors, borders, or CSS classes leaves screen reader users without context of the current page.
**Action:** When implementing or updating navigation components with active states, always include `aria-current="page"` on the active link/button to explicitly convey the current page to screen readers.
