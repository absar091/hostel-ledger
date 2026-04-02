## 2024-04-02 - Redundant Screen Reader Announcements in Icon-only Buttons
**Learning:** When using aria-label on an icon-only button, screen readers can sometimes announce both the label AND the internal SVG icon if it isn't explicitly hidden, creating a confusing experience.
**Action:** Always add aria-hidden="true" to visual-only child elements (like <svg> icons) inside buttons that already have a descriptive text or aria-label.
