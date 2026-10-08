## 2024-05-18 - [Missing React Context Memoization]
**Learning:** Found multiple contexts (AuthContext, SidebarContext) passing inline objects as values, causing unnecessary re-renders of consumer components on every provider render.
**Action:** Always wrap context values in useMemo and wrap methods in useCallback to prevent object reference churn.
