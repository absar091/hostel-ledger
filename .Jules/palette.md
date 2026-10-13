## 2024-05-18 - Missing aria labels for Icon-Only Actions
**Learning:** Found several buttons in `src/components/GroupChat.tsx` that are completely icon-based (e.g. `ImageIcon`, `Info`, `Send`, `X`) but lacked any `aria-label` attributes for screen readers.
**Action:** When adding new icon-only buttons to complex components, make sure they have a concise and descriptive `aria-label` so that users relying on assistive technology can understand their purpose.
