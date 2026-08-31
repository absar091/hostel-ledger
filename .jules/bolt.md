## 2024-03-24 - Lifted Modal/Sheet State from Lists
**Learning:** Rendering complex overlay components like Modals or Sheets inside mapped items for long lists causes massive DOM bloat and memory issues, and can break Radix UI animations if conditionally rendered.
**Action:** When rendering items in long lists, 'lift the state' and render a single global overlay component outside the list, passing the selected item's data to it.
