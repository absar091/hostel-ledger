## 2024-05-19 - Conditionally Rendering Hidden Complex Components
**Learning:** Rendering hidden complex components (like Modals or Sheets containing complete Chat interfaces) for every item in a long list causes significant DOM node and React fiber node bloat, which leads to memory overhead and negatively impacts rendering performance.
**Action:** Always conditionally mount these heavy overlay components (e.g., `{isOpen && <Modal />}`) rather than mounting them unconditionally and relying purely on their internal visibility state, especially when they are mapped over an array.
