## 2024-04-02 - Missing ARIA Labels on Modals
**Learning:** Icon-only buttons in modal headers/footers often lack ARIA labels, causing accessibility issues for screen readers.
**Action:** When creating or reviewing modals and transaction lists, explicitly ensure `aria-label` is applied to icon-only buttons, and that the inner icon (e.g. `X`, `Image`) is given `aria-hidden="true"`.
