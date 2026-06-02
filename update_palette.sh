cat << 'INNER_EOF' >> .jules/palette.md
## $(date +%Y-%m-%d) - Adding accessibility to icon-only buttons with tooltips
**Learning:** When adding `aria-label` attributes to icon-only interactive elements to improve accessibility for screen readers, it's critical to also provide a `title` attribute (or a custom tooltip component) so that sighted users get a native hover tooltip explaining the action.
**Action:** Always include both `aria-label` and `title` (or a dedicated Tooltip component) when an interactive element like a button lacks visible text content.
INNER_EOF
