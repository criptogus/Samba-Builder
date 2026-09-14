## 2024-09-14 - Expand/Collapse Button Accessibility
**Learning:** Icon-only expand/collapse buttons in lists (like `QueuedMessagesList`) must use both `aria-label` (to describe the action) and `aria-expanded` (to indicate current state). Without these, screen reader users miss crucial context about the section's state, especially when standard `title` attributes might not be announced correctly.
**Action:** When implementing collapsible sections with icon-only toggles, always include `aria-expanded={isExpanded}` and a dynamic `aria-label` (e.g., 'Expand section' / 'Collapse section').
