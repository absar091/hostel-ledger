
## 2024-03-24 - Missing accessible names on utility icon buttons
**Learning:** Complex components like chat inputs or detail modals with many icon-only utility buttons often lack accessible names, making them difficult for screen reader users to navigate and understand button purpose.
**Action:** Always add descriptive `aria-label` attributes to icon-only utility buttons, especially those that trigger secondary actions like attaching images, toggling hints, or copying reference IDs.
