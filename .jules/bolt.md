## 2024-05-18 - React.memo broken by inline callback returns and unmemoized event handlers
**Learning:** Returning inline arrow functions from custom hooks (like `useOpenApp`) or failing to memoize event handlers (like `handleToggleSelect`) breaks shallow equality checks for `React.memo` components downstream in list rendering (like `AppShowcaseCard`).
**Action:** Always wrap event handlers passed to list items in `useCallback` and ensure custom hooks that return callbacks (especially for navigation or state updates) wrap those callbacks in `useCallback`.
