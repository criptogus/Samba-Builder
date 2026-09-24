## 2024-09-24 - Extracted ChatItem component in ChatList
**Learning:** ChatList maps over chatGroups and renders each chat item directly in the list, causing the entire ChatList to re-render when hovered/focused states change (since those states are managed in ChatList).
**Action:** Extract the chat item into a memoized `ChatItem` component so only the individual chat item re-renders on hover/focus.
