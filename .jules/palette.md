## 2024-05-18 - Missing ARIA Labels on Icon-Only Buttons in Complex Components
**Learning:** In highly interactive components like chat interfaces, icon-only buttons are frequently used to save space. However, these are often overlooked for screen reader accessibility, making features like attaching files or closing tips entirely inaccessible.
**Action:** Always ensure icon-only buttons have an `aria-label` that clearly describes their function, especially within dynamic interfaces, and define these labels in translation files for consistency.
