## 2024-05-14 - Missing ARIA labels in standard modal headers
**Learning:** Found several native `<button>` elements in common components (e.g., `TransactionDetailModal.tsx`) missing `aria-label` attributes. Notably icon-only buttons for sharing, close, or copying. This is a recurring pattern in the app's modals.
**Action:** When working on modals or icon-only buttons, systematically check adjacent buttons to ensure comprehensive a11y coverage. Use translation hooks (`t()`) if available, otherwise clear descriptive strings like "Close modal".
