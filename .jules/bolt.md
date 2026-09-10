
## 2024-03-24 - Lift state for overlays out of memoized list items
**Learning:** Rendering complex overlays (like ExpenseThreadSheet) inside a React.memo list item component breaks memoization if it manages its own state and causes a large tree rendering inside the list item context.
**Action:** Lift the state (e.g., chatTransaction) and the overlay component out of the individual list item and render it once centrally in the parent list component. Use `useCallback` for event handlers passed down to the list items, and ensure optional chaining is used for overlay props to prevent null reference errors during exit animations.
