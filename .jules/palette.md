## 2024-05-24 - Missing translation keys in title attributes
**Learning:** Using `t('chat.discuss')` in `title` attributes evaluates to the raw string if the translation key is missing, resulting in screen readers announcing "chat dot discuss", which is a poor experience.
**Action:** Always verify translation keys exist symmetrically across all supported languages in `src/lib/i18n.ts` when adding them to assistive UI attributes like `title` and `aria-label`.
