## 2024-05-18 - Lift Modal State out of Lists
**Learning:** Rendering complex overlay components (like Radix UI Sheets/Modals) unconditionally inside mapped list items causes massive DOM bloat.
**Action:** Always lift the state and render a single global overlay component outside the list, passing the selected item's data using optional chaining (e.g. `item?.id || ''`).
