## 2025-05-18 - Avoid toLocaleTimeString inside React Renders
**Learning:** React re-renders very frequently and calling `toLocaleTimeString` or similar native string date methods repeatedly inside maps or loops is extremely slow because it internally spins up a new `Intl.DateTimeFormat` instance every time.
**Action:** Always pre-instantiate `Intl.DateTimeFormat` outside of the component or loop, and use its `.format()` method inside the loop/render instead.
