## 2025-02-14 - Memoizing Custom Hook Returns
**Learning:** Returning unmemoized functions or objects from custom hooks (like `useOpenApp` or `useSelectChat`) causes shallow comparison failures in components like `AppList` or `ChatList` which rely heavily on `React.memo` for performance.
**Action:** Always wrap functions returned from custom hooks in `useCallback`. If returning an object containing these functions, wrap the object in `useMemo` to ensure referential stability and prevent unnecessary downstream re-renders.
