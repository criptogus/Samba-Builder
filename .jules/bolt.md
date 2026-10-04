## 2024-05-24 - Unmemoized hook returns break React.memo

**Learning:** Hook returns (like callbacks from `useOpenApp` or objects from `useSelectChat`) are frequently passed down to list item components. When these aren't memoized (with `useCallback` or `useMemo`), they cause `React.memo`'s shallow comparison to fail on every render of the parent list, triggering a full re-render of all list items. This is a subtle performance anti-pattern in the codebase.
**Action:** Always verify that custom hooks intended to be used in list components return functions wrapped in `useCallback` and objects wrapped in `useMemo`.
