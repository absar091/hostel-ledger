## 2025-04-06 - Added ARIA labels to GroupSettingsSheet icon buttons
**Learning:** The GroupSettingsSheet uses multiple icon-only buttons (copy, search, clear) that lacked aria-labels, making them inaccessible to screen readers despite their clear visual affordances.
**Action:** Always add aria-labels to size="icon" buttons to ensure feature parity for keyboard and screen reader users.
