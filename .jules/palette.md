## 2024-10-24 - Missing ARIA labels in TooltipTrigger Buttons
**Learning:** Icon-only buttons used as `render` props inside `TooltipTrigger`s do not inherit accessible names from their `TooltipContent`. Screen readers may ignore tooltip content on direct focus.
**Action:** Always verify that an inner icon-only `<Button>` inside a `<TooltipTrigger>` has an explicit `aria-label`. Use the same text as the `TooltipContent` (or translation key) for consistency.
