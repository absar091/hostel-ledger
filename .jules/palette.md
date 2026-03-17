## 2024-05-14 - Interactive Button Accessibility
**Learning:** Found that expandable elements like the "Discuss" button or Sidebar toggle were missing the `aria-expanded` attribute, which is crucial for screen readers to understand the state of the UI element.
**Action:** Ensure that any button that toggles visibility of another element uses the `aria-expanded` attribute, passing a boolean representing the state.
