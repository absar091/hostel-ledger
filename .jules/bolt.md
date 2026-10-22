
## 2025-10-22 - [Optimize SidebarContext]
**Learning:** [When writing standalone test scripts (e.g., using `npx tsx`) to verify React components or hooks, avoid using browser-dependent testing libraries like `@testing-library/react` (`renderHook`, `render`), as the standalone Node environment lacks a DOM and will crash with `ReferenceError: document is not defined`. Rely on static build checks (`pnpm build`) or simple import validation scripts instead.]
**Action:** [Use static build verification like `pnpm build` instead of test runners that depend on DOM for isolated typescript structure checks on React context providers when standard test runner fails for complex setup or missing configs.]
