
## 2024-05-24 - Group Chat Icon Buttons missing aria labels
**Learning:** Icon-only interactive elements in complex components like the group chat input are easily overlooked for aria-labels, impacting screen reader usability.
**Action:** Always verify `aria-label` on all `button`s encapsulating only `lucide-react` icons.
