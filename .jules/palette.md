## 2024-05-24 - Tooltip Triggers containing Icon Buttons
**Learning:** Tooltip components in this codebase frequently wrap icon-only buttons (`size="icon"` or similar) as triggers. Because these buttons have no text content and their visual tooltip is rendered elsewhere in the DOM, screen readers cannot derive an accessible name for them. The `<TooltipContent>` text is not automatically associated as the label.
**Action:** Always verify that an inner icon-only `<Button>` inside a `<TooltipTrigger>` has an explicit `aria-label` matching the text or intent of the `TooltipContent`.
