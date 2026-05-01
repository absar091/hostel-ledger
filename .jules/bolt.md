## 2025-05-01 - [O(N) Lookups Inside Render Loops]
**Learning:** Found a nested O(N) array `.find()` operation (`group.members.find()`) inside an O(T) `.map()` loop (`transactions.map()`) in the main rendering path of `GroupDetail.tsx`, resulting in an O(T * M) time complexity where T = transactions and M = members.
**Action:** Replaced the O(N) `.find()` with a memoized `memberMap` built via `useMemo()`, reducing the lookup to O(1) and the overall rendering complexity to O(T + M). Always convert arrays used for repeated lookups into memoized Maps in React components.
