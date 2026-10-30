## 2024-05-15 - Improve Tooltips Accessibility in Collapsible Sidebar
**Learning:** In the collapsed state of the sidebar, replacing native HTML `title` attributes with custom Radix UI tooltips significantly improves accessibility. However, it's crucial to explicitly remove the `title` attribute to avoid double-tooltips and retain the `aria-label` for screen readers on icon-only buttons.
**Action:** Replace `title` attributes with Radix UI `<Tooltip>` while keeping `aria-label` when converting icon-only buttons in dense UIs.
## 2024-05-15 - Improve Tooltips Accessibility in Collapsible Sidebar
**Learning:** In the collapsed state of the sidebar, replacing native HTML `title` attributes with custom Radix UI tooltips significantly improves accessibility. However, it's crucial to explicitly remove the `title` attribute to avoid double-tooltips and retain the `aria-label` for screen readers on icon-only buttons.
**Action:** Replace `title` attributes with Radix UI `<Tooltip>` while keeping `aria-label` when converting icon-only buttons in dense UIs.
