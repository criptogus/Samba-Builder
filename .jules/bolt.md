## 2024-05-15 - React.memo silent breakage with inline hook returns
**Learning:** Returning an inline function from a custom hook like `useOpenApp` will silently break `React.memo` shallow comparison on components that consume it (like `AppList` passing `handleAppClick` down to `AppItem`). This is because the inline function is recreated on every render of the parent component.
**Action:** Always wrap function returns from custom hooks in `useCallback` to ensure stable references across renders, particularly for event handlers passed down to list items.
