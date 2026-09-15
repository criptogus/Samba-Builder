
## 2024-05-18 - React List Rendering Anti-pattern
**Learning:** Found a performance bottleneck specific to this codebase's architecture in how lists handle selection state. List components (like `AppList`) often pass the globally selected ID (e.g., `selectedAppId`) directly to individual list items (`AppItem`). This causes the entire list to re-render when the selection changes because the prop changes for all items, defeating the purpose of `React.memo` if it were used directly.
**Action:** When optimizing list rendering in this codebase, ensure the parent component evaluates the selection state and passes a boolean flag (`isSelected={selectedAppId === app.id}`) to child items, wrap child items in `React.memo()`, and use `useCallback` for stable event handlers.
