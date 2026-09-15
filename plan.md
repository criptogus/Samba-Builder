1. **Optimize `AppItem` rendering**
   - We will update `AppList.tsx` to pass `isSelected={selectedAppId === app.id}` to `AppItem` instead of `selectedAppId={selectedAppId}`. This way, only the previously selected item and the newly selected item will have their props change, preventing the rest of the list from re-rendering.
   - We will also ensure `handleAppClick` is stable (wrapped in `useCallback` if needed, though here it's defined inside render, so we'll wrap it).
2. **Update `appItem.tsx`**
   - Update `AppItem` to receive `isSelected` boolean prop instead of `selectedAppId`.
3. **Test Changes**
   - Run the linter (`npm run lint`).
4. **Complete pre commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
5. **Submit Code**
   - Submit the change with "⚡ Bolt: [performance improvement]" format.
