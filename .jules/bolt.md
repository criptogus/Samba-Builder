## 2024-06-25 - Callbacks from Custom Hooks Can Break React.memo
**Learning:** Callbacks returned from custom hooks (like `useOpenApp`) must be wrapped in `useCallback` if they are passed down as props to memoized child components. Otherwise, they will cause silent full re-renders because the callback reference changes on every render, invalidating the shallow comparison in `React.memo`.
**Action:** Always wrap the return value of custom action hooks in `useCallback` to preserve referential equality and ensure child `React.memo` components behave as expected.
