## 2024-05-24 - Focus Visible Styles for Navigation Elements
**Learning:** Even custom, visually distinct interactive elements like the BottomNav and Sidebar navigation buttons require explicit focus styling for keyboard users.
**Action:** When creating new custom interactive UI components that don't rely on the base `Button` component, explicitly include the `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` utility classes to standardise keyboard accessibility across the app.
