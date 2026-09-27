## 2026-09-27 - Prevent silent React.memo breakage in custom hooks
**Learning:** Custom hooks that return inline functions (like `useOpenApp`) break `React.memo` on child components because the function reference changes on every render. In `AppList`, `handleAppClick` was recreated every time because its dependency `openApp` changed, causing all `AppItem` components to re-render despite being wrapped in `React.memo`.
**Action:** Always wrap functions returned from custom hooks in `useCallback`, especially when they are used as event handlers passed down to memoized list items.
