## 2024-05-14 - Prevent useOpenApp from breaking React.memo

**Learning:** The `useOpenApp` hook returns an unmemoized callback function. When this is passed down to memoized components (like `AppItem` when we pass `handleAppClick`), it breaks `React.memo`'s shallow comparison, causing full re-renders of list items whenever the parent component re-renders.

**Action:** Wrap the returned function from custom hooks like `useOpenApp` in `useCallback` to preserve referential equality and allow `React.memo` to work correctly.
