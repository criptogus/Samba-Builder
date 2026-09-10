## 2024-05-24 - Expensive inner-loop array searches in reducers
**Learning:** React components containing `.reduce` patterns frequently contain O(n^2) or O(n*m) array lookups (like `.find`) inside the loop, unnecessarily blocking the main thread during render.
**Action:** Replace internal `find` calls with an O(1) `Map` lookup created prior to the `reduce` block, and wrap the entire operation in `useMemo` to prevent calculation on every render.
