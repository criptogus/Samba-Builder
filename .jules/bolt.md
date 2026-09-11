## 2026-09-11 - React.memo with inline unmemoized functions

**Learning:** `AppItem` components in `AppList` were re-rendering unnecessarily when `isSearchDialogOpen` state changed because `handleAppClick` was an inline unmemoized function passed to the children, breaking referential equality.

**Action:** When memoizing a child component (e.g. `AppItem`) that receives a function from a parent, ensure the parent's function is wrapped in `useCallback` to maintain referential equality and preserve the `React.memo` optimization.
