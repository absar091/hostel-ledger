## 2024-05-24 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Found several icon-only buttons (copy link, search, close) in GroupSettingsSheet that lacked `aria-label` attributes, which are critical for screen reader users.
**Action:** Always ensure that icon-only `<Button>` or `<button>` elements have descriptive `aria-label`s to improve accessibility.
