## 2024-10-24 - Conditionally Mount Complex Overlays in Long Lists
**Learning:** Unconditionally rendering complex hidden components (like ExpenseThreadSheet) for every item in a long list (like TransactionList) causes significant memory overhead and DOM bloat, even if they are visually hidden.
**Action:** Always conditionally mount complex hidden overlay components (e.g., {showChat && <ExpenseThreadSheet />}) rather than unconditionally rendering them and relying on internal visibility state.
