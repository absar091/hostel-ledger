## 2024-05-20 - Missing Focus Visible States on Custom Interactive Elements
**Learning:** Custom interactive elements (like custom Sidebar buttons or top navigation buttons) often lack focus-visible states by default, which makes the application difficult to navigate for keyboard users.
**Action:** When creating custom buttons or interactive icons, explicitly apply the repository's established class pattern for focus states: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`.
