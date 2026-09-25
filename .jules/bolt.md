## 2024-06-25 - React.memo broken by unmemoized hooks callbacks
**Learning:** Custom hooks that return unmemoized functions (like `useOpenApp` returning a raw arrow function) will silently break `React.memo` shallow comparison when passed down to memoized list item components, causing full list re-renders.
**Action:** Always wrap callbacks returned from custom hooks (like navigation wrappers) in `useCallback` to ensure they maintain referential equality and preserve `React.memo` performance optimizations in consuming components.
