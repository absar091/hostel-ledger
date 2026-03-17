## 2024-05-18 - Stable closures in Context Providers
**Learning:** Returning unmemoized functions (like \`getSettlements\`) in the value of a large React Context Provider causes unnecessary re-renders in child components that depend on them in \`useEffect\` or \`useMemo\` hooks (like in \`src/pages/Groups.tsx\`).
**Action:** Selectively wrap exposed functions in \`useCallback\` in the context provider, especially if those functions are used in downstream hook dependency arrays, to maintain referential equality.
