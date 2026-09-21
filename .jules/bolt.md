## 2024-05-18 - AppShowcaseCard React.memo optimization
**Learning:** List components pass unmemoized hooks and functions (like `useOpenApp` or inline handlers) which silently breaks `React.memo` shallow comparison, causing full list re-renders.
**Action:** Wrap list items in `React.memo` and ensure callbacks passed as props (whether from custom hooks or local handlers) are wrapped in `useCallback`.
