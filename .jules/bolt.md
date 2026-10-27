## 2024-05-23 - Avoid large unmemoized contexts
**Learning:** Massive context providers (like FirebaseAuthContext) are risky to memoize within 50 lines because of complex and deep internal state dependencies. Small targeted contexts (like SidebarContext) are safer quick wins for memoization and have clear impact.
**Action:** When seeking quick wins for performance via memoization, focus on small to medium-sized contexts to avoid breaking large provider functionality due to missed dependencies.
