## 2026-08-27 - Conditionally render expensive overlay components in lists
**Learning:** Unconditionally rendering complex overlay components like Modals or Sheets inside long lists causes huge memory overhead and DOM bloat.
**Action:** Always conditionally mount these components (e.g. `{showChat && <ExpenseThreadSheet />}`) rather than relying on their internal visibility state.
